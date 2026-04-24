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
  // SharePoint anonymous links can be transformed by appending &download=1 for direct download
  let downloadUrl = shareLink;
  if (!downloadUrl.includes("download=1")) {
    downloadUrl += (downloadUrl.includes("?") ? "&" : "?") + "download=1";
  }
  return fetchHttpUrl({ config: JSON.stringify({ url: downloadUrl, filename }) });
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

export const FETCHERS = {
  "google-drive":    { label: "Google Drive folder", fetch: fetchGoogleDrive, fields: ["link", "apiKey"] },
  "gcs":             { label: "Google Cloud Storage bucket", fetch: fetchGCS, fields: ["bucketName", "prefix"] },
  "http-url":        { label: "HTTPS file URL", fetch: fetchHttpUrl, fields: ["url", "filename"] },
  "sharepoint-file": { label: "SharePoint share link (single file)", fetch: fetchSharePointFile, fields: ["shareLink", "filename"] },
  "uploaded-zip":    { label: "Uploaded ZIP archive", fetch: fetchZip, fields: ["zipPath"] },
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
  const r = await fetch(file.downloadUrl);
  if (!r.ok) throw new Error(`Download failed ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(destPath, buf);
  return destPath;
}
