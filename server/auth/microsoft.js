export async function requestDeviceCode(tenantId, clientId) {
  const r = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/devicecode`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      scope: "Files.Read.All Sites.Read.All offline_access",
    }),
  });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`Device code request failed (${r.status}): ${body}`);
  }
  return r.json();
}

export async function pollForToken(tenantId, clientId, deviceCode) {
  const r = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      device_code: deviceCode,
    }),
  });
  return r.json();
}

export async function refreshAccessToken(tenantId, clientId, refreshToken) {
  const r = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      scope: "Files.Read.All Sites.Read.All offline_access",
    }),
  });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`Token refresh failed (${r.status}): ${body}`);
  }
  return r.json();
}

export async function getUserProfile(accessToken) {
  const r = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) throw new Error(`Profile fetch failed: ${r.status}`);
  return r.json();
}

export async function getValidToken(db, programmeId) {
  const auth = db.prepare("SELECT * FROM microsoft_auth WHERE programme_id = ? AND status = 'connected'").get(programmeId);
  if (!auth) return null;

  const expiresAt = new Date(auth.token_expires_at);
  if (expiresAt.getTime() - Date.now() > 5 * 60 * 1000) {
    return auth.access_token;
  }

  const result = await refreshAccessToken(auth.tenant_id, auth.client_id, auth.refresh_token);
  if (result.access_token) {
    db.prepare("UPDATE microsoft_auth SET access_token = ?, refresh_token = ?, token_expires_at = ?, updated_at = datetime('now') WHERE id = ?")
      .run(result.access_token, result.refresh_token || auth.refresh_token, new Date(Date.now() + result.expires_in * 1000).toISOString(), auth.id);
    return result.access_token;
  }

  return null;
}
