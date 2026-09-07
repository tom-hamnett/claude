"""Essay-first UI — the new home flow.

Tabs: ESSAY (the master asset: Socratic Q&A → SCQA essay → mandatory visual library →
Substack/LinkedIn post) · REEL · CAROUSEL · X. Every channel tab derives from the CURRENT
essay and references its named visual library. Replaces the old STUDIO cascade + kanban.
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


def _current_essay(store):
    """The selected essay (persisted in session), or None."""
    eid = st.session_state.get("essay_id")
    return store.get(eid) if eid else None


def _backup():
    try:
        from gtm_engine.persistence import backup_quietly
        backup_quietly()
    except Exception:
        pass


# ── ESSAY tab ────────────────────────────────────────────────────────────────
def render_essay_tab():
    from gtm_engine.essay import EssayStore, Essay
    store = EssayStore()
    st.caption("Start here. Develop ONE essay through the interview, give it real or illustrative "
               "analysis, then spin off a reel, a carousel and an X thread — all from this one piece.")

    essays = store.list_all()
    with st.expander("＋ New essay", expanded=not essays):
        t = st.text_input("Working title / the idea", key="new_essay_title",
                          placeholder="e.g. Utilisation is the lie your dashboard tells you")
        if st.button("Start the interview", disabled=not t.strip(), use_container_width=True):
            eid = store.create(Essay(title=t.strip(), topic=t.strip()))
            st.session_state["essay_id"] = eid
            st.rerun()

    if not essays:
        return
    ids = [e.id for e in essays]
    cur = st.session_state.get("essay_id")
    idx = ids.index(cur) if cur in ids else 0
    sel = st.selectbox("Essay", ids, index=idx, format_func=lambda i: next(
        (e.title for e in essays if e.id == i), str(i)), key="essay_selector")
    st.session_state["essay_id"] = sel
    e = store.get(sel)
    if e:
        _essay_workspace(store, e)


def _essay_workspace(store, e):
    from gtm_engine.essay import engine as eng
    # 1) The insight interview
    st.markdown("### 🗣 Insight interview")
    for x in (e.qa or []):
        if x.get("a"):
            st.markdown(f"**{x['q']}**")
            st.caption(x["a"])
    nq = eng.next_question(e)
    if nq:
        st.markdown(f"**{nq}**")
        ans = st.text_area("Your answer", key=f"ans_{e.id}_{len(e.qa)}", height=90,
                           label_visibility="collapsed")
        if st.button("→ Answer", key=f"ansbtn_{e.id}", disabled=not ans.strip()):
            eng.record_answer(e.id, ans, nq)
            _backup()
            st.rerun()
        st.caption("Answer each question, or skip ahead and write the essay any time.")
    else:
        st.caption("✓ Interview complete.")

    # 2) The essay
    st.markdown("### 📝 The essay (SCQA)")
    gen_label = "↻ Regenerate essay" if e.body else "✨ Write the essay"
    if st.button(gen_label, key=f"geness_{e.id}", disabled=not any(x.get("a") for x in (e.qa or []))):
        with st.spinner("Writing the essay…"):
            eng.generate_essay(e.id)
        _backup()
        st.rerun()
    if e.body:
        body = st.text_area("Essay", e.body, height=280, key=f"body_{e.id}",
                            label_visibility="collapsed")
        if st.button("💾 Save essay", key=f"savebody_{e.id}"):
            e.body = body
            store.save(e)
            _backup()
            st.toast("Essay saved.")
        with st.expander("👁 Preview"):
            st.markdown(e.body)

    # 3) The visual library — MANDATORY analysis
    st.markdown("### 📊 Analysis — the visual library")
    st.caption("At least one is required before you can make channel content. Upload a real chart "
               "where you can; AI-proposed ones are labelled *illustrative*.")
    for v in (e.visuals or []):
        tag = "🟢 real/uploaded" if v.kind in ("real", "uploaded") else "🟡 illustrative"
        c1, c2 = st.columns([6, 1])
        c1.markdown(f"**{v.id} · {v.title}** — _{v.chart_type}_ · {tag}  \n{v.spec}"
                    + (f" · _{v.caption}_" if v.caption else ""))
        if v.image_path and Path(v.image_path).exists():
            c1.image(v.image_path, width=180)
        if c2.button("🗑", key=f"rmv_{e.id}_{v.id}"):
            eng.remove_visual(e.id, v.id)
            _backup()
            st.rerun()
    a, b = st.columns(2)
    if a.button("✨ Propose visuals (illustrative)", key=f"propv_{e.id}",
                disabled=not e.body, use_container_width=True):
        with st.spinner("Proposing analysis…"):
            eng.propose_visuals(e.id)
        _backup()
        st.rerun()
    with b.popover("⬆ Upload a real chart", use_container_width=True):
        up = st.file_uploader("Chart image (PNG/JPG)", type=["png", "jpg", "jpeg"], key=f"vup_{e.id}")
        vt = st.text_input("Short title", key=f"vt_{e.id}")
        vc = st.text_input("Caption (optional)", key=f"vc_{e.id}")
        if up is not None and st.button("Add to library", key=f"vadd_{e.id}"):
            path = _save_upload(up, f"essay_{e.id}")
            eng.add_uploaded_visual(e.id, path, title=vt or "Uploaded chart", caption=vc)
            _backup()
            st.rerun()
    if not e.has_analysis():
        st.warning("⚠ Add at least one analysis visual — the reel, carousel and X thread reference "
                   "these. You can't make channel content until there's one.")

    # 4) The Substack/LinkedIn post
    st.markdown("### 📤 Publish the essay")
    st.caption("Substack uses the essay itself. LinkedIn gets a condensed version.")
    from gtm_engine.essay.derivatives import linkedin_post
    if st.button("✨ LinkedIn version", key=f"li_{e.id}", disabled=not e.body):
        with st.spinner("Condensing for LinkedIn…"):
            e.derivatives = {**(e.derivatives or {}), "linkedin": linkedin_post(e)}
            store.save(e)
        _backup()
        st.rerun()
    li = (e.derivatives or {}).get("linkedin")
    if li:
        st.text_area("LinkedIn post — copy", li, height=160, key=f"lipost_{e.id}")


# ── channel tabs (derive from the current essay) ─────────────────────────────
def _need_essay():
    from gtm_engine.essay import EssayStore
    store = EssayStore()
    e = _current_essay(store)
    if not e:
        st.info("Pick or start an essay in the **ESSAY** tab first.")
        return None, None
    if not e.has_analysis():
        st.warning("This essay has no analysis yet. Add at least one visual in **ESSAY → Analysis** "
                   "before making channel content.")
        return None, None
    return store, e


def render_reel_tab():
    store, e = _need_essay()
    if not e:
        return
    from gtm_engine.essay.derivatives import reel_prompt
    from gtm_engine.video import prompt_to_video as ptv
    st.caption(f"Instagram reel from **{e.title}** — locked template, references the visual library.")
    if st.button("✨ Build the reel prompt", key=f"reelgen_{e.id}", use_container_width=True):
        with st.spinner("Laying out the reel…"):
            e.derivatives = {**(e.derivatives or {}), "reel":
                             {**(e.derivatives or {}).get("reel", {}), "prompt": reel_prompt(e)}}
            store.save(e)
        _backup()
        st.rerun()
    reel = (e.derivatives or {}).get("reel", {})
    prompt = reel.get("prompt", "")
    if prompt:
        st.markdown("**📋 Full prompt for HeyGen — copy this**")
        edited = st.text_area("Reel prompt", prompt, height=340, key=f"reeltxt_{e.id}",
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
            path = _save_upload(up, f"essay_{e.id}")
            reel["video_path"] = path
            e.derivatives["reel"] = reel
            store.save(e)
            _backup()
            st.success("Video saved to this essay.")
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
    st.caption(f"Square carousel from **{e.title}** — for LinkedIn / Instagram.")
    if st.button("✨ Make the carousel", key=f"cargen_{e.id}", use_container_width=True):
        with st.spinner("Designing slides…"):
            specs = carousel_specs(e)
            if specs:
                out = OUTPUT_DIR / "essays" / f"essay_{e.id}" / "carousel"
                paths = render_carousel(specs, out, prefix="slide")
                e.derivatives = {**(e.derivatives or {}), "carousel":
                                 {"specs": specs, "slides": paths}}
                store.save(e)
        _backup()
        st.rerun()
    car = (e.derivatives or {}).get("carousel", {})
    slides = [p for p in (car.get("slides") or []) if Path(p).exists()]
    if slides:
        st.image(slides, width=180)
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
        first = thread.split("\n\n")[0][:275]
        from urllib.parse import quote
        st.link_button("↗ Open X composer (first tweet prefilled)",
                       "https://twitter.com/intent/tweet?text=" + quote(first))
