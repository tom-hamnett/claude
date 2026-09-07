"""Tests for the Essay Engine — the master asset: Q&A flow, SCQA generation, visual library
(mandatory analysis + illustrative labelling)."""

import json
import pytest


@pytest.fixture
def db(tmp_path, monkeypatch):
    p = tmp_path / "essay.db"
    monkeypatch.setattr("gtm_engine.config.SQLITE_PATH", p)
    return p


def test_store_roundtrip(db):
    from gtm_engine.essay import EssayStore, Essay, Visual
    store = EssayStore()
    eid = store.create(Essay(title="The complexity tax"))
    e = store.get(eid)
    assert e.title == "The complexity tax" and e.status == "drafting" and not e.has_analysis()
    e.visuals = [Visual(id="VIZ 1", title="x", spec="bars", kind="illustrative")]
    store.save(e)
    assert store.get(eid).has_analysis()
    assert store.get(eid).visuals[0].is_illustrative()


def test_socratic_flow_cycles_the_questions(db):
    from gtm_engine.essay import EssayStore, Essay
    from gtm_engine.essay.engine import next_question, record_answer, QUESTIONS
    store = EssayStore()
    eid = store.create(Essay(title="X"))
    e = store.get(eid)
    assert next_question(e) == QUESTIONS[0]
    for i in range(len(QUESTIONS)):
        e = record_answer(eid, f"answer {i}")
    assert next_question(e) is None            # interview complete
    assert len(store.get(eid).qa) == len(QUESTIONS)


def test_generate_scqa_essay(db, monkeypatch):
    import gtm_engine.utils.ai_client as aic
    monkeypatch.setattr(aic, "call_claude",
                        lambda *a, **k: "# The Complexity Tax\n\nSituation... Complication... "
                        "Question... Answer. AI collates it now for pennies.")
    from gtm_engine.essay import EssayStore, Essay
    from gtm_engine.essay.engine import generate_essay, record_answer
    store = EssayStore()
    eid = store.create(Essay(title="Complexity"))
    record_answer(eid, "utilisation is a lie")
    e = generate_essay(eid)
    assert "Complexity Tax" in e.body and e.status == "ready"


def test_propose_visuals_are_labelled_illustrative(db, monkeypatch):
    import gtm_engine.utils.ai_client as aic
    monkeypatch.setattr(aic, "call_claude", lambda *a, **k: json.dumps({"visuals": [
        {"title": "Utilisation vs cash", "chart_type": "grouped bars",
         "spec": "utilisation 95% vs free cash flat", "caption": "cash frozen"},
        {"title": "Multiplier", "chart_type": "big number", "spec": "1 to 45", "caption": "cost multiplies"}]}))
    from gtm_engine.essay import EssayStore, Essay
    from gtm_engine.essay.engine import propose_visuals, visual_library_text
    store = EssayStore()
    eid = store.create(Essay(title="X", body="essay body"))
    new = propose_visuals(eid)
    assert len(new) == 2 and new[0].id == "VIZ 1" and new[0].kind == "illustrative"
    lib = visual_library_text(store.get(eid))
    assert "VIZ 1 (illustrative)" in lib and "VIZ 2 (illustrative)" in lib and "1 to 45" in lib


def test_uploaded_visual_is_preferred_kind_and_gates_pass(db):
    from gtm_engine.essay import EssayStore, Essay
    from gtm_engine.essay.engine import add_uploaded_visual, remove_visual, visual_library_text
    store = EssayStore()
    eid = store.create(Essay(title="X"))
    e = add_uploaded_visual(eid, "/tmp/chart.png", title="Real ATLAS log", caption="from the product")
    assert e.has_analysis() and e.visuals[0].kind == "uploaded" and e.visuals[0].id == "VIZ 1"
    assert "(uploaded)" in visual_library_text(e)
    # removing renumbers so ids stay contiguous
    e = add_uploaded_visual(eid, "/tmp/two.png", title="Second")
    e = remove_visual(eid, "VIZ 1")
    assert len(e.visuals) == 1 and e.visuals[0].id == "VIZ 1" and e.visuals[0].title == "Second"


def _essay_with_visuals(store):
    from gtm_engine.essay import Essay, Visual
    eid = store.create(Essay(
        title="The complexity tax",
        body="# The Complexity Tax\n\nUtilisation is a lie. Complexity multiplies cost.",
        visuals=[Visual(id="VIZ 1", title="Utilisation vs cash", chart_type="grouped bars",
                        spec="utilisation 95% vs free cash flat", caption="cash frozen",
                        kind="illustrative"),
                 Visual(id="VIZ 2", title="Multiplier", chart_type="big number",
                        spec="1 to 45", caption="cost multiplies", kind="uploaded")]))
    return store.get(eid)


def test_reel_prompt_uses_locked_template_and_references_library(db, monkeypatch):
    import gtm_engine.utils.ai_client as aic
    monkeypatch.setattr(aic, "call_claude", lambda *a, **k: json.dumps({"scenes": [
        {"beat": "Hook", "role": "presenter", "say": "Utilisation is a lie.", "viz": ""},
        {"beat": "The trap", "role": "data", "say": "Cash sits frozen.", "viz": "VIZ 1"},
        {"beat": "Close", "role": "presenter", "say": "Follow the cash.", "viz": ""}]}))
    from gtm_engine.essay import EssayStore
    from gtm_engine.essay.derivatives import reel_prompt, REEL_STYLE
    e = _essay_with_visuals(EssayStore())
    out = reel_prompt(e)
    assert REEL_STYLE in out                                   # locked style, verbatim
    assert "SCENE / VOICEOVER / VISUAL" in out and "Voiceover:" in out
    assert "VIZ 1 — grouped bars" in out                       # data scene references the library
    assert "label this graphic 'illustrative'" in out         # illustrative flag carried through
    assert "VISUAL LIBRARY" in out and "The Rational Strategist" in out
    assert "Presenter only, framed right-of-centre" in out     # locked hook bookend


def test_x_thread_and_linkedin_and_carousel_from_essay(db, monkeypatch):
    import gtm_engine.utils.ai_client as aic
    from gtm_engine.essay import EssayStore
    e = _essay_with_visuals(EssayStore())
    monkeypatch.setattr(aic, "call_claude", lambda *a, **k: "1/ Utilisation is a lie.\n\n2/ Follow the cash.")
    from gtm_engine.essay.derivatives import x_thread, linkedin_post, carousel_specs
    assert "1/" in x_thread(e)
    monkeypatch.setattr(aic, "call_claude", lambda *a, **k: "Most dashboards lie. Here's why.")
    assert "dashboards" in linkedin_post(e)
    monkeypatch.setattr(aic, "call_claude", lambda *a, **k: json.dumps({"slides": [
        {"type": "cover", "title": "Utilisation is a lie", "body": "here's why"},
        {"type": "cta", "title": "Follow the cash", "body": "read the essay"}]}))
    slides = carousel_specs(e)
    assert len(slides) == 2 and slides[0]["type"] == "cover"
