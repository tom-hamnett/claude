---
name: ihg-pptx-brand
description: IHG Procurement brand rules for ALL PowerPoint output in this repo. Use whenever creating, editing or restyling any slide, deck, presentation or .pptx — including IHG GP Dashboard, APEX, QBR, procurement or management-reporting decks. Every deck is built from the IHG Procurement Lite template's own slides (not from scratch), in Arial, in the IHG Procurement palette.
---

# IHG Procurement — PowerPoint brand rules

**Standing rule (set by Tom, 2026-09-25):** every PowerPoint produced in this
repo conforms to the *IHG Procurement – Lite Template*. No exceptions unless
Tom explicitly asks for something off-brand for a specific deck.

- Template: `assets/IHG_Procurement_Lite_Template.pptx` (54 slides, 16:9, 13.333" × 7.5")
- Visual index of every slide: `assets/ihg-thumbs-1.jpg` … `-5.jpg` (12 per grid, in order)
- Assembler: `scripts/assemble.py`
- Mechanics (XML editing, validation, rendering): the `pptx` skill — load it too.

## 1. Build method — always template-first

Never build an IHG deck with pptxgenjs or python-pptx from a blank
presentation. The masters carry the IHG® PROCUREMENT wordmark, the IHG Hotels &
Resorts logo, the warm-white footer bar and page numbers; blank-canvas decks
lose all of that.

1. Map every piece of content to a template slide using the catalogue in §4.
   Vary the layouts: never three of the same layout in a row.
2. Assemble: `python scripts/assemble.py <out_dir> 2,5,3,17,24,33,54`
   (1-based template slide numbers; repeats allowed; order = output order).
   It prints which `ppt/slides/slideN.xml` holds each position.
3. Replace the text in each slide's XML in place: edit the `<a:t>` runs and
   keep their `<a:rPr>`, so fonts, sizes and colours stay the template's. When
   you have fewer items than the template (e.g. 3 of 5 icons), delete the
   whole group for the spare item (icon + title + body), then re-space the
   rest evenly. When you have more, pick a larger layout or split the slide;
   never shrink the text to fit.
4. Charts: edit the embedded chart's data (`ppt/charts/chartN.xml` and its
   embedded workbook) rather than swapping in images. New native charts go
   on the chart layouts (23, 25, 26) using the chart palette in §2.
5. Zip, validate with `--original assets/IHG_Procurement_Lite_Template.pptx`,
   render and run visual QA per the `pptx` skill. Grep for leftover
   `Lorem|ipsum|Sed ut|Title|Caption|Text goes here|Agenda Item|BRAND|Presentation Title|MONTH / YEAR`.
6. Update speaker notes. Template notes (e.g. slide 3) must be rewritten or
   removed, never left in place.

Only if no template slide can carry a piece of content, instantiate a
master-2 layout (`add_slide.py <dir> slideLayoutN.xml`, see §5) and build on
it by following every rule below. Use this as a last resort.

## 2. Colour

Theme "IHG Procurement". Use theme references (`schemeClr`) where the
template does; use these hex values anywhere else.

| Role | Name | Hex | Theme slot |
|---|---|---|---|
| Primary accent: highlights, key numbers, 01/02 numerals, "FROM" labels | IHG Orange | `E8542C` | accent1 |
| Primary dark: shapes, fills, dark panels, 2nd series | Deep Blue | `1F4456` | dk2 |
| Secondary: 3rd series, flows | Teal | `228891` | accent4 |
| Secondary: 4th series | Sunshine Yellow | `FDBD50` (diagram shade `F4C064`) | accent5 |
| Soft: 5th series, background shapes | Light Teal | `A1C6C8` | — |
| Soft: 6th series, roadmap bands | Sand | `EDD9BC` | — |
| Muted text and rules | Slate | `688997` | accent2 |
| Hairlines and dividers | Cool Grey | `C0C7CA` | accent3 |
| Footer bar and warm panels | Warm White | `F0EDEC` | lt2 |
| Links | Link Teal | `448790` | hlink |
| Body text and titles | Black | `000000` | tx1 |
| Background | White | `FFFFFF` | bg1 |

- **Chart and diagram series order:** Orange → Deep Blue → Teal → Yellow → Light Teal → Sand.
  For two series, use Orange + Deep Blue (as on template slides 25 and 26).
- **Proportions:** mostly white canvas, black text, **one** orange emphasis
  per text block. Deep Blue carries the weight in diagrams.
- **Signature move:** orange on the key phrase inside a black sentence,
  e.g. "Smarter solutions for **your success**." (slides 3 and 54). Use it for
  the "so-what" of a slide.
- Never use off-palette colours: no Office blue, green or purple, and no
  gradients. `37649D` (accent6) is in the theme but the template never uses
  it, so avoid it.

## 3. Typography

- **Arial only**, for every title, body, table, chart label and note. It is
  the template's theme font (major and minor). Graphik is reserved for the
  Showcase template; don't use it here. Never Aptos or Calibri.
- **Titles: 40pt, regular weight (not bold), black, sentence case,** top left.
  Two lines at most; wrap long titles deliberately (see "Content slide\n- 3 Columns").
- Section and statement text: 28pt (e.g. "Smarter solutions…", pie
  percentages, stat callouts).
- Subheads, column heads and agenda items: 18–20pt.
- Body text: 12–14pt, down to 10–11pt only in dense diagrams and timelines.
- Captions, labels and small caps tags: 9–10pt. The chrome ("SECTION TITLE",
  page number) is 9pt and comes from the master.
- Cover date line: 12pt, orange, ALL CAPS with slashes:
  `SEPTEMBER / 2026 / TOM HAMNETT / TITLE`.
- Numerals: `01 02 03` (two digits, orange) for agenda and rows;
  `01.` with a full stop for Contents and Next Steps.
- Bold is for inline labels only, never titles. Left-align body text. Centre
  only where the template does (icon captions, closing slide).

## 4. Template slide catalogue (use these numbers with assemble.py)

**Openers and structure**
| # | Slide | Use for |
|---|---|---|
| 2 | Cover: photo mosaic, title + orange date line | Every deck's first slide |
| 1 | "How to use" 2-col text | Long-form intro text; never keep its content |
| 3 | Our approach: statement + 3 icon pillars | Value proposition / 3 principles |
| 4 | Section divider, full-bleed photo | Major section breaks |
| 5 | Agenda (01–05 with rules) | Agenda (delete unused rows) |
| 13 | Contents (01.–04. Part One…) | Longer agendas / chapter overview |
| 14 | Part 1 centred intro | Soft section divider (no photo) |
| 12 | Split image + "Hello!" statement | Big statement / introduction |

**Content**
| # | Slide | Use for |
|---|---|---|
| 6 | 5 icon columns (category icons) | 5 categories / workstreams |
| 7 | 3 numbered columns (01/02/03) | 3 points with vertical rules |
| 8 | 6 icon tiles (2×3) | 6 benefits / capabilities |
| 9 | 2 photos + 5 icon rows | People / service story |
| 10 | 3 icons (FF&E, HPS, Engineering) | 3 categories with text |
| 11 | Intro + 4 numbered rows | 4 findings / recommendations |
| 15 | 4 image/text tiles with titles | 4 case studies / pillars |
| 16 | FROM → TO (5 rows) | Before/after, current → future state |
| 17–22 | Title + subheading + 1/2/3-column text | Narrative / detail pages |

**Data and charts**
| # | Slide | Use for |
|---|---|---|
| 23 | 4 doughnut KPIs (50% / 30%…) | 4 percentage KPIs |
| 25 | Clustered column chart + 3 stat callouts | Trend + headline stats |
| 26 | Two-bar chart + bullet text | Simple A vs B comparison |
| 24 | 4-step chevron process | Short process |
| 47 | 5-step chevron with icons | 5-step process |
| 48 | Start→End looping process | Journey / lifecycle |

**Timelines and plans**
| # | Slide | Use for |
|---|---|---|
| 27 | 5-phase colour bar timeline | Programme phases |
| 28 | Gantt (Aug–Dec, 3 phases) | Delivery plan by month |
| 29 | Category timeline with milestones | Milestone plan |
| 35 | Q1–Q3 arrow timeline | Quarterly roadmap |
| 36 | Wave timeline with icons | Narrative roadmap |
| 32 | Roadmap with 4 category bands | Multi-stream roadmap |

**Frameworks and diagrams**
| # | Slide | Use for |
|---|---|---|
| 30, 31 | Decision trees (horizontal, vertical) | Decision logic / triage |
| 33 | 5-level pyramid + numbered text | Maturity model / hierarchy |
| 39 | 3-level pyramid with callouts | Simple hierarchy |
| 34 | RACI matrix | Roles & responsibilities |
| 37 | Swimlane flow chart | Process by role |
| 38 | Org chart (Windsor/Atlanta/Shanghai) | Team structure |
| 40, 41, 42, 43 | 3/4/5-point pie, triangle, arc diagrams | Components of a whole |
| 44 | 5 pin markers on a line | 5 milestones / pillars |
| 45 | 4-part cycle | Continuous cycle |
| 46 | Circle + 3 arrows | One input → three outcomes |
| 49, 50 | 2- and 3-circle Venn | Overlap / intersection |
| 51, 52 | Map chart / world continents | Regional split (AMEA, EMEAA, Americas, Greater China) |

**Closers**
| # | Slide | Use for |
|---|---|---|
| 53 | Next Steps (01.–04.) | Actions / next steps (always include in decision decks) |
| 54 | Closing: IHG® PROCUREMENT + "Smarter solutions for your success." | Every deck's last slide, unchanged |

Default skeleton for a management or dashboard deck:
`2 → 5 → (4 or 14 per section) → content/data slides → 53 → 54`.

## 5. Layouts (for new slides only)

Template slides sit on **master 2** (layouts 11–44). The useful ones:
17 Title Only (standard content: header wordmark, footer bar, page no.),
11/12 Title Light/Dark, 13 Contents, 15/16 Section Divider (+ full image),
20/21 Title & Content long/short, 22 Large Statement split image,
23 3 columns in table, 24/25/29 icons, 27/28 4 rows, 30 Diagram chart,
32–34 Title & Content 1/2/3 columns, 36 Deep Blue blank, 40 Deep Blue with
footer, 44 Large Statement Deep Blue with image.

## 6. Composition rules

- White backgrounds for content. Save Deep Blue (`1F4456`) full-bleed for
  rare statement slides (layouts 36, 40, 44) with white text.
- Keep the chrome: IHG® PROCUREMENT wordmark top left, section label top
  right, warm-white footer bar with page number and IHG logo. Never cover,
  move or recolour it. Content stays above the footer bar (bottom edge ≤ 6.8").
- Margins follow the template: content left edge aligned to the title (≈0.6" from the slide edge),
  generous white space, thin black or cool-grey hairlines as dividers
  (slides 3, 5, 7).
- Icons are line icons in IHG Orange (the template set). Reuse them by
  duplicating template slides; don't mix in filled or multicolour icon sets.
- Photography comes from the template's own images only, unless Tom supplies
  more. Never use AI or stock imagery.
- One message per slide. The title states the insight, not the topic
  ("GP margin up 2.1 pts in EMEAA", not "EMEAA results").
- British English spelling.
- Tables: Arial 12pt, black text, hairline rules, orange or Deep Blue header
  text. No heavy fills and no zebra stripes.

## 7. QA checklist (before sending any deck)

- [ ] Built with `assemble.py` from the template, and every slide traces to a template slide number
- [ ] Validation passes with `--original` pointing at the template
- [ ] No placeholder text left (grep in §1.5), no stray template notes
- [ ] Arial only (`grep -o 'typeface="[^"]*"'` shows no Calibri, Aptos or Graphik in edited runs)
- [ ] Only palette colours; charts use the series order in §2
- [ ] Titles 40pt regular, sentence case; one orange emphasis per block
- [ ] Visual QA rendered and inspected: no overflow, orphaned icons or collisions with the footer
- [ ] Cover (2) first, closing (54) last, page numbers intact
