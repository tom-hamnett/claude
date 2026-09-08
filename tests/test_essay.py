"""Tests for the Essay Engine (v2): state model, the wave pipeline (intake → research →
provocation → evidence → personality → five-beat draft → human-voice pass), and derivatives."""

import json
import pytest


@pytest.fixture
def db(tmp_path, monkeypatch):
    p = tmp_path / "essay.db"
    monkeypatch.setattr("gtm_engine.config.SQLITE_PATH", p)
    return p


def test_store_roundtrip_full_state(db):
    from gtm_engine.essay import EssayStore, Essay, Visual
    store = EssayStore()
    eid = store.create(Essay(title="Prism", ai_mode="led", brain_dump=["messy dump"],
                             exclusions=["not about hype"],
                             research={"comprehension": "c", "pole_b": ["reddit gripe"]},
                             provocation={"wrong_belief": "w"}))
    e = store.get(eid)
    assert e.ai_mode == "led" and e.brain_dump == ["messy dump"]
    assert e.exclusions == ["not about hype"] and e.research["pole_b"] == ["reddit gripe"]
    assert e.status == "intake" and not e.has_analysis()
    e.visuals = [Visual(id="VIZ 1", title="x", spec="bars", kind="illustrative", claim="proves it")]
    store.save(e)
    assert store.get(eid).has_analysis() and store.get(eid).visuals[0].claim == "proves it"


def test_intake_and_research_and_propose(db, monkeypatch):
    import gtm_engine.utils.ai_client as aic
    from gtm_engine.essay import EssayStore, Essay
    from gtm_engine.essay import waves
    store = EssayStore()
    e = store.get(store.create(Essay(title="Prism", topic="consultants waste time on research")))

    monkeypatch.setattr(aic, "call_claude", lambda *a, **k: json.dumps({
        "titles": ["The numbers aren't reported"], "angles": ["triangulation"], "ai_mode": "led"}))
    ip = waves.intake_proposals(e)
    assert ip["ai_mode"] == "led" and ip["titles"]

    monkeypatch.setattr(aic, "call_claude", lambda *a, **k: json.dumps({
        "comprehension": "outside-in benchmarking", "standard_practice": "weeks of desk research",
        "pole_a": ["McKinsey POV"], "pole_b": ["how do I actually deliver this"], "gaps": ["triangulation ignored"]}))
    r = waves.wave0_research(e)
    assert r["pole_b"] == ["how do I actually deliver this"] and "triangulation" in r["gaps"][0]

    monkeypatch.setattr(aic, "call_claude", lambda *a, **k: json.dumps({
        "candidates": [{"wrong_belief": "more data is better", "twist": "roughly right beats precise"}]}))
    cands = waves.propose_provocations(e)
    assert cands[0]["twist"].startswith("roughly right")


def test_draft_uses_five_beats_and_ai_mode(db, monkeypatch):
    import gtm_engine.utils.ai_client as aic
    seen = {}
    def fake(prompt, system="", **k):
        seen["sys"] = system
        return "# Prism\n\nEveryone believes more data is better. It's backwards."
    monkeypatch.setattr(aic, "call_claude", fake)
    from gtm_engine.essay import EssayStore, Essay
    from gtm_engine.essay import waves
    store = EssayStore()
    e = store.get(store.create(Essay(title="Prism", ai_mode="led",
                                     provocation={"wrong_belief": "more data is better"})))
    draft = waves.draft_essay(e)
    assert "WRONG BELIEF" in seen["sys"] and "THE TURN" in seen["sys"]     # five-beat structure
    assert "AI is the SUBJECT" in seen["sys"] and "credibility beat" in seen["sys"]  # led mode
    assert draft.startswith("# Prism") and store.get(e.id).status == "draft"


def test_human_voice_pass_enforces_style_and_finalises(db, monkeypatch):
    import gtm_engine.utils.ai_client as aic
    seen = {}
    def fake(prompt, system="", **k):
        seen["sys"] = system
        return "# Prism\n\nYou think more data helps. You're wrong."
    monkeypatch.setattr(aic, "call_claude", fake)
    from gtm_engine.essay import EssayStore, Essay
    from gtm_engine.essay import waves
    store = EssayStore()
    e = store.get(store.create(Essay(title="Prism", draft="# Prism\n\nDraft body here.")))
    body = waves.human_voice_pass(e)
    assert "British English" in seen["sys"] and "single line" in seen["sys"]
    assert "PROHIBITED" in seen["sys"] and body and store.get(e.id).status == "final"


def test_visual_library_helpers(db, monkeypatch):
    import gtm_engine.utils.ai_client as aic
    from gtm_engine.essay import EssayStore, Essay
    from gtm_engine.essay.engine import propose_visuals, add_uploaded_visual, remove_visual, visual_library_text
    store = EssayStore()
    eid = store.create(Essay(title="X", body="essay body"))
    monkeypatch.setattr(aic, "call_claude", lambda *a, **k: json.dumps({"visuals": [
        {"title": "T", "claim": "proves cost", "chart_type": "bar chart", "spec": "1 to 45", "caption": "cap"}]}))
    new = propose_visuals(eid)
    assert new[0].id == "VIZ 1" and new[0].kind == "illustrative" and new[0].claim == "proves cost"
    e = add_uploaded_visual(eid, "/tmp/c.png", title="Real chart")
    assert e.visuals[1].kind == "uploaded" and "(uploaded)" in visual_library_text(e)
    e = remove_visual(eid, "VIZ 1")
    assert len(e.visuals) == 1 and e.visuals[0].id == "VIZ 1"


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
    assert REEL_STYLE in out and "SCENE / VOICEOVER / VISUAL" in out and "Voiceover:" in out
    assert "VIZ 1 — grouped bars" in out and "label this graphic 'illustrative'" in out
    assert "VISUAL LIBRARY" in out and "Presenter only, framed right-of-centre" in out


def test_x_thread_linkedin_carousel(db, monkeypatch):
    import gtm_engine.utils.ai_client as aic
    from gtm_engine.essay import EssayStore
    e = _essay_with_visuals(EssayStore())
    monkeypatch.setattr(aic, "call_claude", lambda *a, **k: "1/ Utilisation is a lie.\n\n2/ Follow the cash.")
    from gtm_engine.essay.derivatives import x_thread, linkedin_post, carousel_specs
    assert "1/" in x_thread(e)
    monkeypatch.setattr(aic, "call_claude", lambda *a, **k: "Most dashboards lie.")
    assert "dashboards" in linkedin_post(e)
    monkeypatch.setattr(aic, "call_claude", lambda *a, **k: json.dumps({"slides": [
        {"type": "cover", "title": "Utilisation is a lie", "body": "here's why"},
        {"type": "cta", "title": "Follow the cash", "body": "read the essay"}]}))
    assert len(carousel_specs(e)) == 2
