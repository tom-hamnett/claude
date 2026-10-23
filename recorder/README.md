# Recorder

Tap record on the Apple Watch. By the next scheduled run (lunchtime or 11pm) you have a short note, a speaker-labelled transcript, tasks filed in Tom OS, and two coaching reports (executive presence; social confidence) built from *how* you spoke as well as what you said. The audio is then deleted.

```
Watch (Just Press Record) -> iPhone -> iCloud Drive
  -> iPhone automation moves new files -> Dropbox /Recorder/Inbox
  -> scheduled Claude task (follows recorder/PROCESS.md)
       transcribe.py: who spoke when (diarization + Tom's voiceprint), Whisper text,
                      voice measures per turn (pitch, loudness, pace, pauses, uptalk),
                      wording markers (fillers, hedges, certainty, questions),
                      turn-taking (airtime, interruptions, reply gaps), laughter
       note -> /Recorder/Notes · actions -> Tom OS (IHG labelled)
       three coaching agents -> their apps (Game, Presence, Leadership)
       metrics -> /Recorder/Metrics (the coaches' baseline over time)
       delete audio from the inbox
```

Free to run: all audio processing is local to the Claude session (sherpa-onnx models, Praat); analysis uses the Claude plan.

## Files
- `transcribe.py`: pipeline entry point (also `--enrol` to build a voiceprint).
- `speakers.py`: diarization and voiceprint matching. `prosody.py`: voice, wording, turn-taking and laughter measures. `models.py`: model downloads.
- `PROCESS.md`: what each scheduled run does.
- `coaches/brief.md`: the coaching agents' brief. `coaches/lenses/*.json`: each coach's capabilities and sub-capabilities. `coaches/publish.py`: turns a coach verdict into app database writes.
- `scoring.py`: overall %, balance penalty, coverage band, and per-skill ratings with uncertainty.
- `library/<lens>/`: technique libraries (taxonomy, techniques.json, sources). `research/benchmark.md`: market benchmark. `rubrics/`: earlier evidence rubrics.
- `apps/`: the three coach apps (template + `build.py`). Live: Game https://claude.ai/artifact/CLfJ87TWZu9NjNjoaiS9oQ · Presence https://claude.ai/artifact/2Np1bFcS2K8CK5mzhgPa3q · Leadership https://claude.ai/artifact/8odaZUGAN8JTWTw9jAJicd
- `IPHONE_SETUP.md`: one-tap recording, the Send to Recorder shortcut and its automations.
- `../tests/test_recorder.py`: unit tests (`pytest tests/test_recorder.py`).
- Dropbox `/Recorder/people_terms.md` (glossary, edit from the Dropbox app) and `/Recorder/System/tom_voice.json` (voiceprint; private, never in the repo).

## Manual run
```bash
pip install sherpa-onnx soundfile praat-parselmouth --break-system-packages
python3 -I recorder/transcribe.py rec.m4a --voiceprint tom_voice.json --out t.md --features f.json
python3 -I recorder/transcribe.py tom_only.m4a --enrol tom_voice.json   # rebuild voiceprint
```

Measured on 4 vCPU: about 20 minutes of processing per hour of audio (small.en). Tested on a 3-minute voice note (one speaker, Tom matched at 0.98) and a mock 3-speaker conversation with laughter (all speakers separated, Tom matched at 0.90 vs 0.14 for others, laugh attributed to the line before it).
