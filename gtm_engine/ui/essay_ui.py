"""Essay-first UI — the wave pipeline (build brief v2).

ESSAY tab walks the waves: intake → research → provocation → evidence → personality →
five-beat draft → human-voice pass → publish. REEL / CAROUSEL / X derive from the current
essay and reference its visual library. Extract-and-propose throughout; voice via transcription.
"""

from pathlib import Path

import streamlit as st


def _save_upload(up, subdir: str) -> str:
    from gtm_engine.config import OUTPUT_DIR
    d = OUTPUT_DIR / "essays" / subdir
    d.mkdir(parents=True, exist_ok=True)
    p = d / up.name
    p.write_bytes(up.getvalue())
    return str(p)


def _backup():
    try:
        from gtm_engine.persistence import backup_quietly
        backup_quietly()
    except Exception:
        pass


def _current_essay(store):
    eid = st.session_state.get("essay_id")
    return store.get(eid) if eid else None


def _transcribe(up) -> str:
    """Audio → text via Gemini (voice-first intake fallback)."""
    try:
        from gtm_engine.utils.media import interpret_file_gemini
        path = _save_upload(up, "audio")
        return interpret_file_gemini(path, "Transcribe this audio verbatim.") or ""
    except Exception:
        return ""


# ── ESSAY tab ────────────────────────────────────────────────────────────────
def render_essay_tab():
    from gtm_engine.essay import EssayStore, Essay
    store = EssayStore()
    st.caption("The master asset. Work one essay through the waves — it proposes where you shrug — "
               "then spin off the reel, carousel and X thread, all from this one piece.")

    essays = store.list_all()
    with st.expander("＋ New essay", expanded=not essays):
        t = st.text_input("Working title / the idea", key="new_essay_title",
                          placeholder="e.g. The numbers you need aren't reported")
        bd = st.text_area("Brain-dump (optional) — everything you want in it, messy is fine",
                          key="new_essay_bd", height=90)
        exc = st.text_input("What it must NOT be about (optional)", key="new_essay_exc")
        au = st.file_uploader("Or record/upload a voice note (transcribed into the dump)",
                              type=["mp3", "m4a", "wav", "webm"], key="new_essay_audio")
        if st.button("Start the essay", disabled=not t.strip(), use_container_width=True):
            dump = [bd.strip()] if bd.strip() else []
            if au is not None:
                tx = _transcribe(au)
                if tx:
                    dump.append(tx)
            eid = store.create(Essay(title=t.strip(), topic=t.strip(), brain_dump=dump,
                                     exclusions=[exc.strip()] if exc.strip() else []))
            st.session_state["essay_id"] = eid
            st.rerun()

    if not essays:
        return
    ids = [e.id for e in essays]
    cur = st.session_state.get("essay_id")
    idx = ids.index(cur) if cur in ids else 0
    sel = st.selectbox("Essay", ids, index=idx,
                       format_func=lambda i: next((e.title for e in essays if e.id == i), str(i)),
                       key="essay_selector")
    st.session_state["essay_id"] = sel
    e = store.get(sel)
    if e:
        _workspace(store, e)


def _save_wave_answers(store, e, key, questions, prefix):
    """Render a wave's questions, collect answers into e.<key>['qa'], save on button."""
    d = dict(getattr(e, key) or {})
    existing = {x["q"]: x["a"] for x in d.get("qa", [])}
    answers = []
    for i, q in enumerate(questions):
        a = st.text_area(q, value=existing.get(q, ""), key=f"{prefix}_{e.id}_{i}", height=70)
        answers.append({"q": q, "a": a.strip()})
    if st.button("💾 Save answers", key=f"{prefix}save_{e.id}"):
        d["qa"] = answers
        setattr(e, key, d)
        store.save(e)
        _backup()
        st.toast("Saved.")
        st.rerun()
    return d


def _workspace(store, e):
    from gtm_engine.essay import waves
    from gtm_engine.essay import engine as ve

    st.markdown(f"**Status:** `{e.status}` · **AI mode:** `{e.ai_mode}`")

    # [0] Intake — proposals + AI mode
    with st.expander("① Intake — titles, angles, AI mode", expanded=e.status == "intake"):
        if st.button("✨ Get proposals", key=f"intake_{e.id}"):
            with st.spinner("Reading your dump…"):
                st.session_state[f"intake_{e.id}"] = waves.intake_proposals(e)
        ip = st.session_state.get(f"intake_{e.id}")
        if ip:
            if ip.get("titles"):
                pick = st.radio("Suggested titles", ip["titles"], key=f"title_{e.id}")
                if st.button("Use this title", key=f"usetitle_{e.id}"):
                    e.title = pick
                    store.save(e)
                    st.rerun()
            if ip.get("angles"):
                st.caption("Angles: " + " · ".join(ip["angles"]))
        mode = st.radio("AI mode", ["led", "adjacent", "none"],
                        index=["led", "adjacent", "none"].index(e.ai_mode),
                        key=f"mode_{e.id}", horizontal=True,
                        help="led = AI is the subject · adjacent = one lever · none = pure strategy")
        if mode != e.ai_mode:
            e.ai_mode = mode
            store.save(e)

    # [1] Wave Zero — research
    with st.expander("② Research — comprehension & the field (Pole A / Pole B)"):
        if st.button("✨ Run research", key=f"w0_{e.id}"):
            with st.spinner("Researching the field…"):
                e.research = waves.wave0_research(e)
                e.status = "research"
                store.save(e)
            _backup()
            st.rerun()
        r = e.research or {}
        if r:
            st.markdown(f"**What it is:** {r.get('comprehension','')}")
            st.markdown(f"**Standard practice:** {r.get('standard_practice','')}")
            if r.get("pole_a"):
                st.markdown("**Pole A (prestige):** " + " · ".join(r["pole_a"]))
            if r.get("pole_b"):
                st.markdown("**Pole B (raw):** " + " · ".join(r["pole_b"]))
            if r.get("gaps"):
                st.markdown("**Gaps:** " + " · ".join(r["gaps"]))

    # [2] Wave One — provocation
    with st.expander("③ Provocation — the wrong belief & the twist"):
        _save_wave_answers(store, e, "provocation", waves.WAVE1_QUESTIONS, "w1")
        if st.button("💡 Propose provocations (from research)", key=f"w1p_{e.id}"):
            st.session_state[f"w1cand_{e.id}"] = waves.propose_provocations(e)
        for c in (st.session_state.get(f"w1cand_{e.id}") or []):
            st.info(f"**Belief:** {c.get('wrong_belief','')}\n\n**Twist:** {c.get('twist','')}")

    # [3] Wave Two — evidence / visual library
    with st.expander("④ Evidence — the analysis (mandatory)"):
        _save_wave_answers(store, e, "provocation", waves.WAVE2_QUESTIONS, "w2")
        st.caption("Upload real charts where you can; AI-proposed ones are labelled *illustrative*.")
        for v in (e.visuals or []):
            tag = "🟢 uploaded" if v.kind in ("real", "uploaded") else "🟡 illustrative"
            c1, c2 = st.columns([6, 1])
            c1.markdown(f"**{v.id} · {v.title}** — _{v.chart_type}_ · {tag}"
                        + (f"  \nProves: {v.claim}" if v.claim else "")
                        + (f"  \n{v.spec}" if v.spec else ""))
            if v.image_path and Path(v.image_path).exists():
                c1.image(v.image_path, width=170)
            if c2.button("🗑", key=f"rmv_{e.id}_{v.id}"):
                ve.remove_visual(e.id, v.id)
                _backup()
                st.rerun()
        a, b = st.columns(2)
        if a.button("✨ Propose visuals", key=f"propv_{e.id}", disabled=not e.body,
                    use_container_width=True):
            with st.spinner("Proposing analysis…"):
                ve.propose_visuals(e.id)
            _backup()
            st.rerun()
        with b.popover("⬆ Upload a real chart", use_container_width=True):
            up = st.file_uploader("Chart (PNG/JPG)", type=["png", "jpg", "jpeg"], key=f"vup_{e.id}")
            vt = st.text_input("Title", key=f"vt_{e.id}")
            vcl = st.text_input("What it proves", key=f"vcl_{e.id}")
            if up is not None and st.button("Add to library", key=f"vadd_{e.id}"):
                ve.add_uploaded_visual(e.id, _save_upload(up, f"essay_{e.id}"),
                                       title=vt or "Uploaded chart", claim=vcl)
                _backup()
                st.rerun()
        if not e.has_analysis():
            st.warning("⚠ At least one visual is required before you can make channel content.")

    # [4] Wave Three — personality
    with st.expander("⑤ Personality — incredulity, sarcasm, references"):
        _save_wave_answers(store, e, "personality", waves.WAVE3_QUESTIONS, "w3")
        if st.button("💡 Propose references (+ one to disqualify)", key=f"w3p_{e.id}"):
            st.session_state[f"w3ref_{e.id}"] = waves.propose_references(e)
        ref = st.session_state.get(f"w3ref_{e.id}")
        if ref:
            for x in ref.get("references", []):
                st.caption(f"• {x.get('ref','')} — {x.get('why','')}")
            if ref.get("disqualify"):
                st.caption(f"🚫 Disqualify the obvious: {ref['disqualify']}")

    # [5]+[6] Draft + human-voice pass
    st.markdown("### 📝 The essay")
    words = st.slider("Target length (words)", 300, 900, 550, 50, key=f"len_{e.id}")
    c1, c2 = st.columns(2)
    if c1.button("✨ Write the five-beat draft", key=f"draft_{e.id}", use_container_width=True):
        with st.spinner("Drafting…"):
            waves.draft_essay(e, words=words)
        _backup()
        st.rerun()
    if c2.button("🫧 Human-voice pass", key=f"voice_{e.id}", use_container_width=True,
                 disabled=not (e.draft or e.body)):
        with st.spinner("Making it read human…"):
            waves.human_voice_pass(e)
        _backup()
        st.rerun()
    show = e.body or e.draft
    if show:
        body = st.text_area("Essay", show, height=320, key=f"body_{e.id}",
                            label_visibility="collapsed")
        if st.button("💾 Save essay", key=f"savebody_{e.id}"):
            e.body = body
            e.status = "final"
            store.save(e)
            _backup()
            st.toast("Saved.")
        with st.expander("👁 Preview"):
            st.markdown(e.body or e.draft)

    # publish (Substack = the essay; LinkedIn = condensed)
    if e.body:
        from gtm_engine.essay.derivatives import linkedin_post
        st.markdown("### 📤 Publish")
        if st.button("✨ LinkedIn version", key=f"li_{e.id}"):
            with st.spinner("Condensing for LinkedIn…"):
                e.derivatives = {**(e.derivatives or {}), "linkedin": linkedin_post(e)}
                store.save(e)
            _backup()
            st.rerun()
        li = (e.derivatives or {}).get("linkedin")
        if li:
            st.text_area("LinkedIn post — copy", li, height=150, key=f"lipost_{e.id}")


# ── channel tabs ─────────────────────────────────────────────────────────────
def _need_essay():
    from gtm_engine.essay import EssayStore
    store = EssayStore()
    e = _current_essay(store)
    if not e:
        st.info("Pick or start an essay in the **ESSAY** tab first.")
        return None, None
    if not e.body:
        st.warning("Finish the essay first (in the **ESSAY** tab).")
        return None, None
    if not e.has_analysis():
        st.warning("This essay has no analysis yet — add at least one visual in **ESSAY → Evidence**.")
        return None, None
    return store, e


def render_reel_tab():
    store, e = _need_essay()
    if not e:
        return
    from gtm_engine.essay.derivatives import reel_prompt
    st.caption(f"Instagram reel from **{e.title}** — locked template, references the visual library.")
    if st.button("✨ Build the reel prompt", key=f"reelgen_{e.id}", use_container_width=True):
        with st.spinner("Laying out the reel…"):
            reel = {**(e.derivatives or {}).get("reel", {}), "prompt": reel_prompt(e)}
            e.derivatives = {**(e.derivatives or {}), "reel": reel}
            store.save(e)
        _backup()
        st.rerun()
    reel = (e.derivatives or {}).get("reel", {})
    if reel.get("prompt"):
        st.markdown("**📋 Full prompt for HeyGen — copy this**")
        edited = st.text_area("Reel prompt", reel["prompt"], height=340, key=f"reeltxt_{e.id}",
                              label_visibility="collapsed")
        if st.button("💾 Save prompt", key=f"reelsave_{e.id}"):
            reel["prompt"] = edited
            e.derivatives["reel"] = reel
            store.save(e)
            _backup()
            st.toast("Saved.")
        st.caption("Copy → HeyGen **Prompt to Video** → approve its plan → render → drop the MP4 back.")
        up = st.file_uploader("Rendered it? Drop the MP4 here", type=["mp4", "mov", "webm"],
                              key=f"reelmp4_{e.id}")
        if up is not None:
            reel["video_path"] = _save_upload(up, f"essay_{e.id}")
            e.derivatives["reel"] = reel
            store.save(e)
            _backup()
            st.success("Video saved.")
            st.rerun()
        if reel.get("video_path") and Path(reel["video_path"]).exists():
            st.video(reel["video_path"])


def render_carousel_tab():
    store, e = _need_essay()
    if not e:
        return
    from gtm_engine.essay.derivatives import carousel_specs
    from gtm_engine.content_studio.carousel import render_carousel
    from gtm_engine.config import OUTPUT_DIR
    st.caption(f"Square carousel from **{e.title}**.")
    if st.button("✨ Make the carousel", key=f"cargen_{e.id}", use_container_width=True):
        with st.spinner("Designing slides…"):
            specs = carousel_specs(e)
            if specs:
                out = OUTPUT_DIR / "essays" / f"essay_{e.id}" / "carousel"
                paths = render_carousel(specs, out, prefix="slide")
                e.derivatives = {**(e.derivatives or {}), "carousel": {"specs": specs, "slides": paths}}
                store.save(e)
        _backup()
        st.rerun()
    slides = [p for p in ((e.derivatives or {}).get("carousel", {}).get("slides") or []) if Path(p).exists()]
    if slides:
        st.image(slides, width=170)
        st.caption(f"{len(slides)} slides — download and post.")


def render_x_tab():
    store, e = _need_essay()
    if not e:
        return
    from gtm_engine.essay.derivatives import x_thread
    st.caption(f"X thread from **{e.title}** — plain and sharp, no hard sell.")
    if st.button("✨ Write the X thread", key=f"xgen_{e.id}", use_container_width=True):
        with st.spinner("Writing the thread…"):
            e.derivatives = {**(e.derivatives or {}), "x": {"thread": x_thread(e)}}
            store.save(e)
        _backup()
        st.rerun()
    thread = (e.derivatives or {}).get("x", {}).get("thread", "")
    if thread:
        st.text_area("X thread — copy", thread, height=280, key=f"xthread_{e.id}",
                     label_visibility="collapsed")
        from urllib.parse import quote
        st.link_button("↗ Open X composer (first tweet prefilled)",
                       "https://twitter.com/intent/tweet?text=" + quote(thread.split("\n\n")[0][:275]))
