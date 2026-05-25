# Vantage — local-first processing: build plan

*Goal: analyse/synthesise what we need on the user's own machine and let only the **minimum** leave it. This is the engineering plan behind the brief's privacy-by-design architecture (§9.4, §9A.5, §17). It is incremental: each phase is shippable and reduces what egresses.*

## Principle (what "minimal egress" means)

Raw audio/video is the sensitive asset; it must stay on the device. The judge only needs **interpretation inputs**, not the recording. So the boundary is:

```
ON-DEVICE: ingest → transcribe → extract signals → redact → build evidence package
EGRESS (minimal, consented): redacted transcript + numeric signals [+ optional cropped frames]
CLOUD: Claude judges (user-only, evidence-cited) → result returns
LOCAL: encrypted store, dashboard, trend
```

## Where it runs (revised): assistant-native first

People won't install software on a work machine or involve IT. So the **primary** path
is **assistant-native** — regenerate a Vantage recipe inside the AI assistant the org
already sanctions (Copilot/Gemini/Claude), which already has governed access to the
meetings and transcripts. Processing happens in-tenant; only the chosen result leaves.
This also removes the need to build/run ASR, because the meeting platform already
transcribed the meeting. Built: `vantage/recipes/` (canonical recipe + per-platform
deploy guides).

The order of preference is now:
1. **Assistant-native recipe (default, zero-install)** — Copilot / Gemini Gem / Claude
   Project run the recipe in-tenant; user pastes the result into Vantage.
2. **Installed companion agent (optional, power users / self-hosters)** — the Node
   agent below, for people who want a device-local binary or automatic native-video
   capture.
3. **Browser app** — manual one-off uploads; Web-Audio prosody only (sandboxed).

The installed-agent work in Phase 1 (below) remains valid for path 2; it is no longer
the default.

## Phases

### Phase 1 — Data-minimisation core ✅ (done, this commit)
- `redact.mjs` — local rules-based PII redaction (emails, phones, cards, URLs, IDs + user terms), timecode-safe. Unit-tested.
- `signals.mjs` — local deterministic signals (talk-time ratio, WPM, question rate, open-Q ratio, fillers, hedges, absolutes, longest monologue). Unit-tested.
- `transcribe.mjs` — pluggable local ASR (ffmpeg audio-extract + local Whisper auto-detect/`VANTAGE_WHISPER_CMD`), with explicit cloud fallback only when `--cloud` is passed.
- `agent.mjs` — refactored to **local-first by default**: transcribe→signals→redact→judge(redacted text). Raw media never leaves unless `--cloud`. Logs exactly what egressed per file.

### Phase 2 — Local ASR hardening
- Standardise on one bundled engine for zero-config installs (candidate: **whisper.cpp** via a small wrapper, with auto model download), keeping `VANTAGE_WHISPER_CMD` for power users.
- Word-level timestamps + local diarisation (speaker turns) so signals and "on the tape" quotes are precise; isolate the user by voiceprint locally.
- ffprobe-based exact duration for accurate WPM and budgeting.

### Phase 3 — Local prosody
- A small on-device audio pass (pitch variance, energy, pause lengths, response latency) so the *vocal* presence layer is computed locally and travels as numbers, not audio.

### Phase 4 — Visual presence without shipping the video
- ffmpeg samples ~1 fps; a **local person/face detector crops to the user**; only those **cropped, low-res frames** egress (consented), for the visual layer — never the room, never the full video.
- Fallback remains the explicit `--cloud` native-video path for users who accept it.

### Phase 5 — Push into the app & zero-egress tier
- Agent writes results into the app's history (local import) instead of just sidecar JSON.
- **Fully on-prem / local-model judge** option (e.g., a local LLM) for regulated environments — *zero egress*, quality-traded, behind the same interface.

## Decisions / open forks
- **Bundled Whisper engine** (whisper.cpp vs WASM transformers.js vs system Python whisper) — affects install UX; current layer is pluggable so this can be chosen later without rework.
- **Diarisation locally** is the hardest local piece; until it's solid, signals use a "primary speaker = most words" proxy.
- **Browser local path**: do we invest in WASM Whisper for short manual clips, or keep the browser as the cloud/manual surface and reserve local-first for the agent? (Leaning: agent-only local-first for now.)

## Honest status
Phase 1 is real and tested (redaction + signals run locally; the pipeline is wired). The ML stages (ffmpeg/Whisper) are integrated with detection and graceful fallback but were not run in this environment — they need ffmpeg + a local Whisper on a real machine to exercise end-to-end. Visual presence in local mode is deferred to Phase 4; until then local mode analyses video at audio grade and `--cloud` remains the route to full visual.
