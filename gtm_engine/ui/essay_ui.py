"""Essay-first UI — upload flow.

The essay and its analysis are written outside the tool and UPLOADED here: paste/upload the
essay body, upload each supporting analysis artefact (chart image or dataset) into the visual
library. REEL / CAROUSEL / X then derive from the current essay and reference that library.
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


_ESSAY_TYPES = ["md", "txt", "markdown", "docx", "pdf"]
_ART_TYPES = ["png", "jpg", "jpeg", "csv", "xlsx", "tsv", "txt", "md", "pdf"]


def _read_file(up, subdir: str) -> str:
    from gtm_engine.utils.ingest import interpret_upload
    txt, _ = interpret_upload(_save_upload(up, subdir), up.name)
    return txt or ""


# ── ESSAY tab ────────────────────────────────────────────────────────────────
def render_essay_tab():
    from gtm_engine.essay import EssayStore, Essay
    store = EssayStore()
    st.caption("Write the essay and its analysis wherever you like, then upload them here. "
               "Everything downstream — reel, carousel, X thread — is built from what you upload.")

    essays = store.list_all()
    with st.expander("＋ New essay", expanded=not essays):
        t = st.text_input("Title", key="new_essay_title",
                          placeholder="e.g. The numbers you need aren't reported")
        paste = st.text_area("Paste the essay", key="new_essay_body", height=160,
                             placeholder="Paste the full essay here…")
        up = st.file_uploader("…or upload it (md / txt / docx / pdf)", type=_ESSAY_TYPES,
                              key="new_essay_file")
        if st.button("Create essay", disabled=not (t.strip() or up), use_container_width=True):
            body = paste.strip()
            if up is not None and not body:
                body = _read_file(up, "essay_src")
            title = t.strip() or (up.name.rsplit(".", 1)[0] if up else "Untitled")
            eid = store.create(Essay(title=title, topic=title, body=body, status="final"))
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
        _upload_workspace(store, e)


def _upload_workspace(store, e):
    from gtm_engine.essay import engine as ve
    # 1) The essay — paste-editable or replace from a file
    st.markdown("### 📝 Essay")
    body = st.text_area("Essay", e.body, height=300, key=f"body_{e.id}", label_visibility="collapsed")
    c1, c2 = st.columns([1, 1])
    if c1.button("💾 Save essay", key=f"savebody_{e.id}", use_container_width=True):
        e.body = body
        e.status = "final"
        store.save(e)
        _backup()
        st.toast("Essay saved.")
    rep = c2.file_uploader("Replace from file", type=_ESSAY_TYPES, key=f"repl_{e.id}",
                           label_visibility="collapsed")
    if rep is not None:
        txt = _read_file(rep, "essay_src")
        if txt:
            e.body = txt
            store.save(e)
            _backup()
            st.rerun()
    if e.body:
        with st.expander("👁 Preview"):
            st.markdown(e.body)

    # 2) Supporting analysis — the visual library (upload each artefact)
    st.markdown("### 📊 Supporting analysis")
    st.caption("Upload each chart or dataset that proves a point. These are what the reel, carousel "
               "and X thread reference. A chart image is strongest.")
    for v in (e.visuals or []):
        c1, c2 = st.columns([6, 1])
        c1.markdown(f"**{v.id} · {v.title}**"
                    + (f"  \nProves: {v.claim}" if v.claim else "")
                    + (f"  \n{v.spec[:200]}" if v.spec else ""))
        if v.image_path and Path(v.image_path).exists():
            c1.image(v.image_path, width=180)
        if c2.button("🗑", key=f"rmv_{e.id}_{v.id}"):
            ve.remove_visual(e.id, v.id)
            _backup()
            st.rerun()
    with st.expander("⬆ Add an analysis artefact", expanded=not e.visuals):
        up = st.file_uploader("Chart image or data file", type=_ART_TYPES, key=f"art_{e.id}")
        vt = st.text_input("Title", key=f"artt_{e.id}")
        vcl = st.text_input("What it proves (the claim)", key=f"artc_{e.id}")
        vcap = st.text_input("Caption (optional)", key=f"artcap_{e.id}")
        if up is not None and st.button("Add to library", key=f"vadd_{e.id}"):
            path = _save_upload(up, f"essay_{e.id}")
            ext = up.name.rsplit(".", 1)[-1].lower()
            if ext in ("png", "jpg", "jpeg"):
                ve.add_uploaded_visual(e.id, path, title=vt or up.name, caption=vcap, claim=vcl)
            else:
                spec = _read_file(up, f"essay_{e.id}")
                ve.add_uploaded_visual(e.id, "", title=vt or up.name, caption=vcap, claim=vcl,
                                       spec=spec[:1500])
            _backup()
            st.rerun()
    if not e.has_analysis():
        st.warning("⚠ Add at least one analysis artefact — the reel, carousel and X thread "
                   "reference these.")
    else:
        st.caption("→ Build the **reel**, **carousel** and **X** thread in their tabs.")


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
        st.warning("This essay has no analysis yet — add at least one in **ESSAY → Supporting analysis**.")
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
