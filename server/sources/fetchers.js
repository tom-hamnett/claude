// Source fetcher implementations.
// Each returns { files: [{id, name, lastModified, contentHash, downloadUrl, sizeBytes, mimeType}] }
import crypto from "crypto";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";

// Extract Google Drive folder ID from a share link
function extractDriveFolderId(link) {
  const m = link.match(/folders\/([a-zA-Z0-9_-]+)/) || link.match(/id=([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

// Google Drive: public folder via API key
async function fetchGoogleDrive(source) {
  const { link, apiKey } = JSON.parse(source.config);
  const folderId = extractDriveFolderId(link);
  if (!folderId) throw new Error("Couldn't extract folder ID from Drive link");
  if (!apiKey) throw new Error("Google Drive API key required (even for public folders)");

  const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,modifiedTime,md5Checksum,size)&key=${apiKey}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Drive API ${r.status}: ${await r.text()}`);
  const data = await r.json();

  return {
    files: (data.files || []).map(f => ({
      id: f.id,
      name: f.name,
      lastModified: f.modifiedTime,
      contentHash: f.md5Checksum || f.modifiedTime,
      downloadUrl: `https://www.googleapis.com/drive/v3/files/${f.id}?alt=media&key=${apiKey}`,
      sizeBytes: parseInt(f.size) || 0,
      mimeType: f.mimeType,
    })).filter(f => !f.mimeType?.includes("folder")),
  };
}

// GCS: public bucket listing
async function fetchGCS(source) {
  const { bucketName, prefix } = JSON.parse(source.config);
  if (!bucketName) throw new Error("bucketName required");
  const params = prefix ? `?prefix=${encodeURIComponent(prefix)}` : "";
  const url = `https://storage.googleapis.com/storage/v1/b/${bucketName}/o${params}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`GCS ${r.status}: ${await r.text()}`);
  const data = await r.json();

  return {
    files: (data.items || []).map(f => ({
      id: f.name,
      name: f.name.split("/").pop(),
      lastModified: f.updated,
      contentHash: f.md5Hash || f.etag,
      downloadUrl: `https://storage.googleapis.com/${bucketName}/${f.name}`,
      sizeBytes: parseInt(f.size) || 0,
      mimeType: f.contentType,
    })),
  };
}

// HTTP URL: single file
async function fetchHttpUrl(source) {
  const { url, filename } = JSON.parse(source.config);
  if (!url) throw new Error("URL required");

  // HEAD request to get metadata
  let headRes;
  try { headRes = await fetch(url, { method: "HEAD" }); } catch (e) { /* some servers don't allow HEAD */ }
  const etag = headRes?.headers?.get("etag") || "";
  const lastModified = headRes?.headers?.get("last-modified") || new Date().toISOString();
  const size = parseInt(headRes?.headers?.get("content-length") || "0");
  const mime = headRes?.headers?.get("content-type") || "";
  const name = filename || url.split("/").pop().split("?")[0] || "file";

  return {
    files: [{
      id: url,
      name,
      lastModified,
      contentHash: etag || lastModified,
      downloadUrl: url,
      sizeBytes: size,
      mimeType: mime,
    }],
  };
}

// SharePoint anonymous share link — treated same as http-url but with specific URL munging
async function fetchSharePointFile(source) {
  const { shareLink, filename } = JSON.parse(source.config);
  if (!shareLink) throw new Error("shareLink required");
  let downloadUrl = shareLink;
  if (!downloadUrl.includes("download=1")) {
    downloadUrl += (downloadUrl.includes("?") ? "&" : "?") + "download=1";
  }
  return fetchHttpUrl({ config: JSON.stringify({ url: downloadUrl, filename }) });
}

// Encode a sharing URL for the Microsoft Graph /shares endpoint (no auth needed for anonymous links)
function encodeShareUrl(url) {
  const base64 = Buffer.from(url).toString("base64").replace(/=/g, "").replace(/\//g, "_").replace(/\+/g, "-");
  return "u!" + base64;
}

// SharePoint shared folder — uses the Graph /shares API with a sharing link.
// Works with anonymous links OR authenticated via Microsoft OAuth (delegated).
// If source._microsoftAccessToken is set, uses it for auth (allows org-internal links).
async function fetchSharePointSharedFolder(source) {
  const config = typeof source.config === "string" ? JSON.parse(source.config) : source.config;
  const { shareLink, fileTypes, recursive } = config;
  if (!shareLink) throw new Error("shareLink required — copy a sharing link from SharePoint for the folder");

  const headers = {};
  if (source._microsoftAccessToken) {
    headers.Authorization = `Bearer ${source._microsoftAccessToken}`;
  }

  const encoded = encodeShareUrl(shareLink);
  const allowedTypes = fileTypes ? fileTypes.split(",").map(t => t.trim().toLowerCase()) : null;
  const maxDepth = parseInt(config.maxDepth) || 5;
  const maxFiles = parseInt(config.maxFiles) || 500;
  const maxFolders = 200;
  const startTime = Date.now();
  const timeoutMs = 120000;
  let totalFiles = 0;
  let foldersScanned = 0;

  async function listFolder(url, prefix, depth) {
    if (depth > maxDepth) return [];
    if (totalFiles >= maxFiles) return [];
    if (foldersScanned >= maxFolders) return [];
    if (Date.now() - startTime > timeoutMs) return [];
    foldersScanned++;

    let allItems = [];
    let nextUrl = url;

    while (nextUrl) {
      const r = await fetch(nextUrl, { headers });
      if (!r.ok) {
        if (depth === 0) {
          const body = await r.text();
          if (r.status === 401 || r.status === 403) {
            if (source._microsoftAccessToken) {
              throw new Error("Access denied — your Microsoft account may not have access to this folder, or your session has expired. Try reconnecting in Settings → Microsoft Connection.");
            }
            throw new Error("Access denied — make sure the folder sharing link is set to 'Anyone with the link can view'. In SharePoint: right-click folder → Share → People you choose → change to 'Anyone' → Apply → Copy link. Or connect your Microsoft account in Settings.");
          }
          throw new Error(`SharePoint folder listing failed ${r.status}: ${body}`);
        }
        return [];
      }
      const listing = await r.json();
      allItems = allItems.concat(listing.value || []);
      nextUrl = listing["@odata.nextLink"] || null;
    }

    let files = allItems
      .filter(f => !f.folder && !f.remoteItem?.folder)
      .filter(f => !allowedTypes || allowedTypes.some(ext => f.name.toLowerCase().endsWith(ext)))
      .map(f => ({
        id: f.id,
        name: prefix ? `${prefix}/${f.name}` : f.name,
        lastModified: f.lastModifiedDateTime,
        contentHash: f.file?.hashes?.sha256Hash || f.eTag || f.lastModifiedDateTime,
        downloadUrl: f["@microsoft.graph.downloadUrl"],
        sizeBytes: f.size || 0,
        mimeType: f.file?.mimeType || "application/octet-stream",
      }));

    totalFiles += files.length;
    console.log(`[sharepoint] ${prefix || "/"} → ${files.length} files (${totalFiles} total, ${foldersScanned} folders scanned)`);

    if (recursive && totalFiles < maxFiles && foldersScanned < maxFolders) {
      const folders = allItems.filter(f => f.folder);
      for (const sub of folders) {
        if (totalFiles >= maxFiles || foldersScanned >= maxFolders || Date.now() - startTime > timeoutMs) break;
        const subPath = prefix ? `${prefix}/${sub.name}` : sub.name;
        const subUrl = prefix
          ? `https://graph.microsoft.com/v1.0/shares/${encoded}/driveItem:/${encodeURIComponent(prefix)}/${encodeURIComponent(sub.name)}:/children`
          : `https://graph.microsoft.com/v1.0/shares/${encoded}/driveItem:/${encodeURIComponent(sub.name)}:/children`;
        try {
          const subFiles = await listFolder(subUrl, subPath, depth + 1);
          files = files.concat(subFiles);
        } catch (e) { console.log(`[sharepoint] Skipped ${subPath}: ${e.message}`); }
      }

      // Follow SharePoint shortcuts (remoteItem references) — but only 1 level deep
      const shortcuts = allItems.filter(f => f.remoteItem?.folder);
      for (const shortcut of shortcuts) {
        if (totalFiles >= maxFiles || foldersScanned >= maxFolders || Date.now() - startTime > timeoutMs) break;
        const remoteDriveId = shortcut.remoteItem.parentReference?.driveId;
        const remoteItemId = shortcut.remoteItem.id;
        if (!remoteDriveId || !remoteItemId) continue;
        const shortcutPath = prefix ? `${prefix}/${shortcut.name}` : shortcut.name;
        console.log(`[sharepoint] Following shortcut: ${shortcutPath} (1 level only)`);
        const remoteUrl = `https://graph.microsoft.com/v1.0/drives/${remoteDriveId}/items/${remoteItemId}/children`;
        try {
          // Fetch only the immediate children of the shortcut target — no further recursion
          foldersScanned++;
          const sr = await fetch(remoteUrl, { headers });
          if (sr.ok) {
            const shortcutListing = await sr.json();
            const shortcutFiles = (shortcutListing.value || [])
              .filter(f => !f.folder && !f.remoteItem?.folder)
              .filter(f => !allowedTypes || allowedTypes.some(ext => f.name.toLowerCase().endsWith(ext)))
              .map(f => ({
                id: f.id,
                name: `${shortcutPath}/${f.name}`,
                lastModified: f.lastModifiedDateTime,
                contentHash: f.file?.hashes?.sha256Hash || f.eTag || f.lastModifiedDateTime,
                downloadUrl: f["@microsoft.graph.downloadUrl"],
                sizeBytes: f.size || 0,
                mimeType: f.file?.mimeType || "application/octet-stream",
              }));
            totalFiles += shortcutFiles.length;
            files = files.concat(shortcutFiles);
            console.log(`[sharepoint] Shortcut ${shortcutPath} → ${shortcutFiles.length} files`);
          }
        } catch (e) { console.log(`[sharepoint] Skipped shortcut ${shortcutPath}: ${e.message}`); }
      }
    }

    return files;
  }

  const rootUrl = `https://graph.microsoft.com/v1.0/shares/${encoded}/driveItem/children`;
  const files = await listFolder(rootUrl, "", 0);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[sharepoint] Scan complete: ${files.length} files, ${foldersScanned} folders, ${elapsed}s`);
  return { files };
}

// ZIP: extract contents, return each file
async function fetchZip(source) {
  const { zipPath } = JSON.parse(source.config);
  if (!zipPath || !fs.existsSync(zipPath)) throw new Error("ZIP file not found on server");

  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();
  const stats = fs.statSync(zipPath);

  return {
    files: entries.filter(e => !e.isDirectory).map(e => ({
      id: `${zipPath}#${e.entryName}`,
      name: e.entryName.split("/").pop(),
      lastModified: new Date(stats.mtime).toISOString(),
      contentHash: crypto.createHash("md5").update(e.getData()).digest("hex"),
      downloadUrl: `zip://${zipPath}#${e.entryName}`, // custom scheme, handled internally
      sizeBytes: e.header.size,
      mimeType: "application/octet-stream",
    })),
  };
}

// Microsoft Graph API: get access token using client credentials (Azure AD app registration)
async function getMicrosoftToken(tenantId, clientId, clientSecret) {
  const r = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });
  if (!r.ok) throw new Error(`Azure AD token error ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return data.access_token;
}

// SharePoint folder via Microsoft Graph API
async function fetchSharePointFolder(source) {
  const config = typeof source.config === "string" ? JSON.parse(source.config) : source.config;
  const { tenantId, clientId, clientSecret, siteHostname, sitePath, folderPath, fileTypes } = config;
  if (!tenantId || !clientId || !clientSecret) throw new Error("tenantId, clientId, and clientSecret are required (from Azure AD app registration)");
  if (!siteHostname) throw new Error("siteHostname required (e.g. yourcompany.sharepoint.com)");

  const token = await getMicrosoftToken(tenantId, clientId, clientSecret);
  const headers = { Authorization: `Bearer ${token}` };

  // Resolve the SharePoint site ID
  const siteLookup = sitePath
    ? `https://graph.microsoft.com/v1.0/sites/${siteHostname}:/${sitePath}`
    : `https://graph.microsoft.com/v1.0/sites/${siteHostname}:/`;
  const siteRes = await fetch(siteLookup, { headers });
  if (!siteRes.ok) throw new Error(`SharePoint site lookup failed ${siteRes.status}: ${await siteRes.text()}`);
  const site = await siteRes.json();

  // List files in the folder (or root)
  const drivePath = folderPath
    ? `https://graph.microsoft.com/v1.0/sites/${site.id}/drive/root:/${folderPath}:/children`
    : `https://graph.microsoft.com/v1.0/sites/${site.id}/drive/root/children`;
  const listRes = await fetch(drivePath, { headers });
  if (!listRes.ok) throw new Error(`SharePoint file listing failed ${listRes.status}: ${await listRes.text()}`);
  const listing = await listRes.json();

  const allowedTypes = fileTypes ? fileTypes.split(",").map(t => t.trim().toLowerCase()) : null;

  return {
    files: (listing.value || [])
      .filter(f => !f.folder)
      .filter(f => !allowedTypes || allowedTypes.some(ext => f.name.toLowerCase().endsWith(ext)))
      .map(f => ({
        id: f.id,
        name: f.name,
        lastModified: f.lastModifiedDateTime,
        contentHash: f.file?.hashes?.sha256Hash || f.eTag || f.lastModifiedDateTime,
        downloadUrl: f["@microsoft.graph.downloadUrl"] || `https://graph.microsoft.com/v1.0/sites/${site.id}/drive/items/${f.id}/content`,
        sizeBytes: f.size || 0,
        mimeType: f.file?.mimeType || "application/octet-stream",
        _graphToken: token,
      })),
  };
}

// OneDrive folder via Microsoft Graph API (uses a specific user's drive)
async function fetchOneDriveFolder(source) {
  const config = typeof source.config === "string" ? JSON.parse(source.config) : source.config;
  const { tenantId, clientId, clientSecret, userId, folderPath, fileTypes } = config;
  if (!tenantId || !clientId || !clientSecret) throw new Error("tenantId, clientId, and clientSecret are required");
  if (!userId) throw new Error("userId required (email address or user ID of the OneDrive owner)");

  const token = await getMicrosoftToken(tenantId, clientId, clientSecret);
  const headers = { Authorization: `Bearer ${token}` };

  const drivePath = folderPath
    ? `https://graph.microsoft.com/v1.0/users/${userId}/drive/root:/${folderPath}:/children`
    : `https://graph.microsoft.com/v1.0/users/${userId}/drive/root/children`;
  const listRes = await fetch(drivePath, { headers });
  if (!listRes.ok) throw new Error(`OneDrive listing failed ${listRes.status}: ${await listRes.text()}`);
  const listing = await listRes.json();

  const allowedTypes = fileTypes ? fileTypes.split(",").map(t => t.trim().toLowerCase()) : null;

  return {
    files: (listing.value || [])
      .filter(f => !f.folder)
      .filter(f => !allowedTypes || allowedTypes.some(ext => f.name.toLowerCase().endsWith(ext)))
      .map(f => ({
        id: f.id,
        name: f.name,
        lastModified: f.lastModifiedDateTime,
        contentHash: f.file?.hashes?.sha256Hash || f.eTag || f.lastModifiedDateTime,
        downloadUrl: f["@microsoft.graph.downloadUrl"] || `https://graph.microsoft.com/v1.0/users/${userId}/drive/items/${f.id}/content`,
        sizeBytes: f.size || 0,
        mimeType: f.file?.mimeType || "application/octet-stream",
        _graphToken: token,
      })),
  };
}

export const FETCHERS = {
  "sharepoint-shared":  { label: "SharePoint shared folder (no IT needed)", fetch: fetchSharePointSharedFolder, fields: ["shareLink", "fileTypes", "recursive"] },
  "sharepoint-folder":  { label: "SharePoint folder (IT-managed)", fetch: fetchSharePointFolder, fields: ["tenantId", "clientId", "clientSecret", "siteHostname", "sitePath", "folderPath", "fileTypes"] },
  "onedrive-folder":    { label: "OneDrive folder (IT-managed)",   fetch: fetchOneDriveFolder,   fields: ["tenantId", "clientId", "clientSecret", "userId", "folderPath", "fileTypes"] },
  "google-drive":       { label: "Google Drive folder", fetch: fetchGoogleDrive, fields: ["link", "apiKey"] },
  "gcs":                { label: "Google Cloud Storage bucket", fetch: fetchGCS, fields: ["bucketName", "prefix"] },
  "http-url":           { label: "HTTPS file URL", fetch: fetchHttpUrl, fields: ["url", "filename"] },
  "sharepoint-file":    { label: "SharePoint share link (single file)", fetch: fetchSharePointFile, fields: ["shareLink", "filename"] },
  "uploaded-zip":       { label: "Uploaded ZIP archive", fetch: fetchZip, fields: ["zipPath"] },
};

export async function fetchSource(source) {
  const f = FETCHERS[source.type];
  if (!f) throw new Error(`Unknown source type: ${source.type}`);
  return f.fetch(source);
}

// Download a file's bytes to a local path (for ingestion)
export async function downloadFile(file, destPath) {
  if (file.downloadUrl.startsWith("zip://")) {
    const [zipPath, entryName] = file.downloadUrl.slice(6).split("#");
    const zip = new AdmZip(zipPath);
    const entry = zip.getEntry(entryName);
    if (!entry) throw new Error("ZIP entry not found");
    fs.writeFileSync(destPath, entry.getData());
    return destPath;
  }
  const headers = {};
  if (file._graphToken && file.downloadUrl.includes("graph.microsoft.com")) {
    headers.Authorization = `Bearer ${file._graphToken}`;
  }
  const r = await fetch(file.downloadUrl, { headers });
  if (!r.ok) throw new Error(`Download failed ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(destPath, buf);
  return destPath;
}
