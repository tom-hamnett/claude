# Recorder

Tap record on the Apple Watch, and a few hours later a short analysis, the transcript and filed to-dos are waiting. The audio is then deleted.

```
Watch (Just Press Record) -> iPhone -> iCloud Drive
  -> iPhone automation moves new files -> Dropbox /Recorder/Inbox
  -> hourly Claude scheduled task (follows recorder/PROCESS.md)
       transcribe offline (Whisper small.en, recorder/transcribe.py)
       analyse -> /Recorder/Notes/YYYY-MM/<note>.md
       personal actions -> Tom OS · IHG actions stay in the note only
       delete audio from the inbox
```

Free to run: transcription happens inside the Claude session, and analysis uses the Claude plan.

## Files
- `transcribe.py`: audio in, `[mm:ss]` transcript out. Splits at pauses (Silero VAD), runs Whisper via sherpa-onnx.
- `PROCESS.md`: what the hourly run does.
- `../tests/test_recorder.py`: unit tests (`pytest tests/test_recorder.py`).
- Dropbox `/Recorder/people_terms.md`: Tom's glossary of names and terms (edit from the Dropbox app).

## Manual run
```bash
pip install sherpa-onnx soundfile --break-system-packages
python3 -I recorder/transcribe.py recording.m4a --out transcript.md   # small.en default
python3 -I recorder/transcribe.py recording.m4a --model base.en       # faster, less accurate
```

Measured on the first test (3 min voice note, 4 vCPU): base.en 18 s, small.en 48 s. small.en got names right that base.en missed.
