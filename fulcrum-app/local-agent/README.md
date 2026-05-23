# FULCRUM local capture agent

An **optional, opt-in** companion that watches folders on your machine for new
recordings and evaluates them automatically, at **full quality** — so you don't
upload each meeting by hand. It's the reliable path for **video** (no browser
CORS limits) and doubles as your **Teams / Meet / Zoom capture connector**.

- **Video** → Gemini Pro (visual presence: eye contact, posture, gesture, expression + tone + words).
- **Audio** → Deepgram (transcribe + diarise) → Claude.
- **Transcripts** → Claude.
- Self-only, local, **budget-aware** (daily video cap), and de-duped (skips files it's already done).

## Capture connectors — the clever bit

You usually don't need OAuth apps. Meeting recordings already **sync to local
folders**, so just point the agent at them:

| Environment | Watch this folder |
|---|---|
| **Microsoft Teams / 365** | your **OneDrive** sync folder (Teams recordings land in OneDrive/SharePoint) |
| **Google Meet** | your **Google Drive** desktop-sync folder (Meet → Drive) |
| **Zoom** | your local **Zoom** recordings folder (`~/Documents/Zoom`) |
| **Anything else** | any folder you save recordings to (local capture, Loom exports…) |

(Server-side OAuth connectors — Graph / Drive API / Zoom webhooks — are a later
enhancement for users who don't run a local machine; the sync-folder approach
covers the large majority today.)

## Use

```bash
export GEMINI_API_KEY=...        # video
export ANTHROPIC_API_KEY=...     # the evaluation model
export DEEPGRAM_API_KEY=...      # audio transcription (optional)
export FULCRUM_DAILY_VIDEO_MIN=60   # soft daily video budget (0 = unlimited)

node agent.mjs "~/OneDrive/Recordings" "~/Zoom" "~/Drive/Meet Recordings"
```

A `*.fulcrum.json` report appears next to each recording. Requires Node 18+.

## Roadmap

- ffprobe-based exact duration for precise budgeting.
- Push reports straight into the web app's history.
- Optional server-side OAuth connectors (Graph / Drive / Zoom) for headless use.
