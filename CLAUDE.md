# Standing rules for this repo

## PowerPoint output: IHG Procurement brand (mandatory)

All PowerPoint/.pptx output in this repo must conform to the IHG Procurement
Lite template. Before creating or editing any deck, load the
`ihg-pptx-brand` skill (`.claude/skills/ihg-pptx-brand/SKILL.md`) together
with the `pptx` skill, and follow them:

- Build decks from the template's own slides with
  `.claude/skills/ihg-pptx-brand/scripts/assemble.py`. Never start from a
  blank canvas.
- Use Arial only. Use the IHG Procurement palette: Orange `E8542C`,
  Deep Blue `1F4456`, Teal `228891`, Yellow `FDBD50`, Light Teal `A1C6C8`,
  Sand `EDD9BC`, and Warm White `F0EDEC` for the footer.
- Titles are 40pt, regular weight, in sentence case. Emphasise the key
  phrase in orange. Keep the template chrome (wordmark, footer, page numbers).
- Open with cover slide 2 and close with slide 54. Run the QA checklist in
  the skill before delivering a deck.
