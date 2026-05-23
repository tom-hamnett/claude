# FULCRUM local passive agent

An **optional, opt-in** companion that watches a folder on your machine for new
conversation transcripts and evaluates them automatically with the same FULCRUM
rubric — so you don't have to upload each one by hand.

It is deliberately local and minimal:

- It only watches **one folder you choose**.
- It only ever calls **your** Anthropic API key — audio/transcripts never go to
  any FULCRUM server (there isn't one).
- It writes a `*.fulcrum.json` report next to each transcript, which you can open
  or import.

> **Why a local companion?** A browser app cannot read your filesystem
> automatically — that's a good security boundary. The passive-agent experience
> therefore runs here, on your machine, under your control. The in-app
> upload/record flow needs no companion at all.

## Use

```bash
export ANTHROPIC_API_KEY=sk-ant-...
node agent.mjs /path/to/your/transcripts
```

Drop a `.txt` / `.vtt` / `.srt` transcript into that folder (label your lines
`Me:` so the engine can isolate you) and a report appears beside it.

## Roadmap

- Audio → transcript via a local or hosted ASR provider (Whisper / Deepgram /
  AssemblyAI) so it can watch `.m4a` / `.mp4` meeting recordings directly.
- Speaker diarisation + voiceprint to attribute your turns automatically.
- Push the report straight into the web app's history.
