# VANTAGE local capture agent

An **optional, opt-in** companion that watches folders on your machine for new
recordings and evaluates them automatically — so you don't upload each meeting by
hand. It doubles as your **Teams / Meet / Zoom capture connector**.

## Privacy: local-first by default

The agent processes recordings **on your own machine** and sends only a **minimal,
redacted evidence package** to the judge:

1. **Transcribe locally** (ffmpeg extracts the audio; a local Whisper transcribes it) — raw audio/video never leaves the device.
2. **Extract signals locally** (`signals.mjs`) — talk-time, question rate, fillers, longest monologue, etc.
3. **Redact locally** (`redact.mjs`) — emails, phones, cards, URLs, IDs and your own sensitive terms are stripped.
4. **Judge** — only the *redacted transcript + numeric signals* go to Claude. Raw media stays put.

Output: a `*.vantage.json` report next to each recording, and a one-line log of
exactly **what left your machine**.

### Setup (local-first)

```bash
export ANTHROPIC_API_KEY=...            # the evaluation model (judge)

# local transcription prerequisites:
#   - ffmpeg on PATH            (audio extract + duration)
#   - a local Whisper, e.g. whisper.cpp or the openai-whisper CLI
export VANTAGE_WHISPER_MODEL=base.en    # or a path to a whisper.cpp ggml model
# (optional) fully explicit engine:
# export VANTAGE_WHISPER_CMD='whisper-cli -m /path/ggml-base.en.bin -f {in} -otxt -of {out}'

# (optional) redact your own sensitive terms (clients, projects, people):
export VANTAGE_REDACT_TERMS="Acme Corp,Project Titan,Jane Doe"

node agent.mjs "~/OneDrive/Recordings" "~/Zoom" --every 30
```

If ffmpeg + Whisper aren't found, the agent tells you and skips (it won't silently
upload). Note: in local mode, **video is analysed at audio grade** — visual
presence (eye contact, posture) needs the cloud path or the upcoming
consented-cropped-frames feature.

### Opt-in cloud path (`--cloud`)

Only if you accept raw media leaving the device:

```bash
export ANTHROPIC_API_KEY=...  GEMINI_API_KEY=...  DEEPGRAM_API_KEY=...
node agent.mjs "~/Zoom" --cloud      # video → Gemini (full visual presence); audio → Deepgram
```

The log marks these runs `[cloud] sent: RAW VIDEO/AUDIO uploaded …` so it's never ambiguous.

## Capture connectors — the clever bit

You usually don't need OAuth apps. Meeting recordings already **sync to local
folders**, so just point the agent at them:

| Environment | Watch this folder |
|---|---|
| **Microsoft Teams / 365** | your **OneDrive** sync folder (Teams recordings land in OneDrive/SharePoint) |
| **Google Meet** | your **Google Drive** desktop-sync folder (Meet → Drive) |
| **Zoom** | your local **Zoom** recordings folder (`~/Documents/Zoom`) |
| **Anything else** | any folder you save recordings to (local capture, Loom exports…) |

## Flags & env

- `--every <minutes>` — rescan on a schedule (for synced folders); omit for real-time only.
- `--cloud` — allow the raw-media cloud path (off by default).
- `VANTAGE_DAILY_VIDEO_MIN` — soft daily budget for the cloud video path (0 = unlimited).
- `VANTAGE_WHISPER_MODEL` / `VANTAGE_WHISPER_CMD` — local ASR engine.
- `VANTAGE_REDACT_TERMS` — extra sensitive terms to redact.

Requires Node 18+.

## Roadmap

- Consented, user-cropped ~1 fps frames for visual presence (keeps raw video local).
- Local prosody (pitch/energy) via a small on-device audio pass.
- Push reports straight into the web app's history.
- Fully on-prem / local-model judge (zero egress) for regulated environments.
