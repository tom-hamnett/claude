# Technique library schema

One library per coach: `recorder/library/<coach>/` with
- `taxonomy.md`: capabilities → sub-capabilities, each with a one-line definition, what "excellent" looks like, and how it shows up in a recorded conversation.
- `techniques.json`: an array of technique records (below).
- `sources.md`: numbered source list (author, year, title, URL or edition) with what was used (full text, summary, author interview, review) and a one-line credibility note.

## Technique record
```json
{
  "id": "game-impudence-012",
  "name": "Short, plain name",
  "capability": "Playfulness & Impudence",
  "sub_capability": "Teasing",
  "summary": "1-2 sentences in our own words: what it is.",
  "how_to_apply": "1-3 sentences: concrete behaviour.",
  "example_line": "A short illustrative line (written by us, not quoted).",
  "observable_in_audio": "yes | partial | no",
  "markers": ["what to look for in transcript/voice/turn-taking, using recorder/prosody.py field names where relevant"],
  "common_mistakes": ["..."],
  "drill": "One practice exercise.",
  "sources": [{"ref": 3, "where": "chapter / concept name"}],
  "evidence": "research-backed | practitioner-consensus | single-author | contested",
  "ethics": "ok | caution | manipulative",
  "ethics_note": "Required unless ethics is ok."
}
```
Rules: paraphrase only (no passages from books; quotes under 15 words, max one per source). Every record cites at least one source. Mark merged ideas that several authors share by citing all of them; that's a signal of practitioner consensus.
