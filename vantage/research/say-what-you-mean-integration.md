# Integrating Tom's *Say What You Mean* database

**Source:** `say-what-you-mean-practical-items-minto-structured.csv` (320 rows; Minto-structured extraction of Oren Jay Sofer's *Say What You Mean*).

This file records **what's in the database, how good it is, and exactly how it feeds the VANTAGE curriculum and the diagnostic rubric.**

---

## 1. What it contains

A Minto pyramid (foundation → chapter → subpillar → tool-class → item) over the book's practical content. It collapses to **11 teachable units** under four foundations:

| Foundation (Sofer) | Rows | Maps to VANTAGE track |
|---|---|---|
| **Presence** | 47 | Track 1 (M1–M2) |
| **Intention** | 53 | Track 1 (M3) + Track 2 (M5–M6) |
| **Attention** | 102 | Track 2 (M4–M7) |
| **Integration** (live application) | 102 | Track 4 (M13) + practice design across all |

**Teachable units (subpillars), by volume:**
| Unit | Rows | Tool mix | VANTAGE home |
|---|---|---|---|
| Emotional literacy (feelings) | 141 | mostly assessment/reflection | M6, M3 |
| Needs and values | 71 | balanced | **M6** (needs beneath positions) |
| Observation and clarity (obs. vs. evaluation) | 66 | principle/guideline/assessment | **M5/M6/M2** |
| Empathy and listening | 17 | practice/assessment | **M4/M5** |
| Mindfulness and regulation (pause) | 12 | step/assessment | **M1/M2** |
| Requests and agreements | 4 | mixed | **M12/M14** |
| Grief, anger, conflict-repair, habits, general | ~9 | mixed | M2, M13 |

**Item types available to drop into modules:** Assessment/reflection (142), Practice/exercise (51), Step-by-step process (46), Principle (39), Tool/guideline (38), Example/script (4).

## 2. Honest data-quality assessment

- **Strength:** confirms the Sofer spine and gives ready framing (principle → exercise → assessment) plus concrete example phrases per unit.
- **Limitations:** auto-extracted — `practical_guidance`/`example` fields are **templated and repeat** across rows within a subpillar (the ~320 rows are really ~11 units × many page-anchors, not 320 distinct ideas). `confidence_score` is low (min 4, median 14, max 30). `source_anchor` fields are raw OCR fragments.
- **Implication:** treat it as a **structured idea-mine and citation index into the book**, not finished copy. Distinct teachable content ≈ the 11 units + their example phrases. Use it to *seed* module content; write the actual lessons fresh (also avoids reproducing the book's text — see IP note in README).
- **Coverage gap:** nothing on delivery/vocal, substance/credibility, storytelling, or negotiation/sales structure. Those come from the other benchmarks (Bates, Hewlett, SPIN, Voss, Crucial Conversations).

## 3. The biggest win: OFNR → detectable rubric signals

The database's NVC backbone — **O**bservation, **F**eelings, **N**eeds, **R**equests — is not just teachable, it's **measurable in a transcript**. This directly enriches the diagnostic. Added to `rubric/bars-rubric.md`:

| DB unit | New rubric competency | Detectable signal (lexical) |
|---|---|---|
| Observation and clarity | **Observation vs. Evaluation** | observational language ("when X happened…") vs. blame/absolutes ("you always/never", character labels) |
| Emotional literacy + Needs and values | **Feelings & Needs Literacy** | "I feel X because I need Y" vs. accusation/judgment ("you are Z / you don't care") |
| Requests and agreements | **Clear Requests** | concrete, specific, doable asks vs. vague complaints or veiled demands |

Example phrases pulled from the database (usable as anchors):
- Obs vs eval: *"When I was halfway through my point and the topic changed, I felt cut off"* vs. *"You never listen."*
- Feelings: *"I feel anxious about tomorrow's meeting"* vs. *"I feel ignored."*
- Needs: *"I'm upset because I need reliability"* vs. *"You just don't care."*
- Request: *"Would you text me by 5 if you'll be late?"*
- Empathy/listening: *"Are you feeling frustrated because you wanted more support?"*
- Pause/regulation: *"Pause for one slow inhale and exhale before answering."*

## 4. How it plugs in (action plan)
1. **Rubric:** OFNR competencies added now (see rubric file) — gives the diagnostic three new, high-signal, easy-to-detect dimensions straight from Tom's data.
2. **Modules:** use the unit's principle/exercise/assessment items to seed practice material for M1–M7 (the spine), written fresh.
3. **Tutor RAG:** the CSV (with its `minto_path` and `source_page`) is a clean retrieval index — the Socratic tutor can cite book location when explaining a concept.
4. **De-dup pass (later):** collapse the 320 rows to the ~11 distinct units + curated examples; keep `source_page` anchors for citations.
