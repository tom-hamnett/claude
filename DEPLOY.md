# APEX — Deployment & Startup

## Quick Start (Codespace)

### One-command startup (development mode, with HMR)

```bash
npm run dev
```

This starts both the Vite frontend (port 5173) and the Express backend (port 3001) concurrently. The Vite dev server proxies `/api/*` requests to the backend automatically.

Open the **port 5173** forwarded URL in your browser.

### Production mode (single port, no HMR)

```bash
npm start
```

Builds the frontend then starts Express on port 3001 serving both the API and the SPA. Open the **port 3001** forwarded URL.

The `.devcontainer/devcontainer.json` runs production mode automatically on Codespace start.

---

## Accessing from a Work Laptop (Edge)

1. Open this repo in GitHub Codespaces (green "Code" button → Codespaces → create/open)
2. Wait for the terminal to show `[apex] Server running on http://0.0.0.0:3001`
3. In the **PORTS** tab (bottom panel), find port **3001**
4. **Right-click → Port Visibility → Public** (required for Edge to reach it)
5. Click the forwarded URL (globe icon) — it opens APEX in your browser

If you see "No programmes yet", the backend is likely not running. Open a terminal and run `npm start`.

---

## Port Visibility (important)

Codespace ports default to **Private** (authenticated to your GitHub account only). If your work browser can't reach the URL:

- VS Code: PORTS tab → right-click the port → **Port Visibility → Public**
- `gh` CLI: `gh codespace ports visibility 3001:public`

---

## Scripts Reference

| Script | What it does |
|--------|-------------|
| `npm run dev` | Vite (5173) + Express (3001) together. Dev mode with HMR. |
| `npm run dev:fe` | Vite frontend only (port 5173). Need `npm run server` separately. |
| `npm run server` | Express backend only (port 3001). |
| `npm start` | Build frontend + start Express (port 3001). Production mode. |
| `npm run build` | Build frontend to `/dist` only. |

---

## Database

SQLite database at `apex.db` in the project root. Created automatically on first server start.

Codespace storage is **ephemeral** — if the Codespace is deleted and recreated, the database resets. To preserve data across rebuilds, export via the Tableau/CSV endpoints before deleting a Codespace.

---

## Environment Variables (optional)

Set in a `.env` file at the project root or in Codespace secrets:

| Variable | Purpose |
|----------|---------|
| `PORT` | Server port (default: 3001) |
| `ANTHROPIC_API_KEY` | Fallback AI provider if no engine configured in UI |
| `GITHUB_TOKEN` | GitHub Copilot models provider |

LLM engines are normally configured per-programme in the APEX Settings UI, not via env vars.
