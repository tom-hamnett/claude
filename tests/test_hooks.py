"""Tests for the Hook Library + 5-point DNA gate."""

from gtm_engine.hooks import (
    list_hooks, get_hook, hook_brief, evaluate_dna, passion_label, ROTATE, TONES,
)


def test_hook_library_has_archetypes():
    hooks = list_hooks()
    assert len(hooks) >= 6
    for h in hooks:
        assert h["id"] and h["name"] and h["example"] and h["guidance"]


def test_hook_brief_named_and_rotate():
    assert "ARCHETYPE" in hook_brief("uncomfortable_truth")
    assert "best hook" in hook_brief(ROTATE).lower() or "choose" in hook_brief(ROTATE).lower()
    assert get_hook("named_number")["name"] == "Named Number"


def test_passion_label_bands():
    assert "calm" in passion_label(0.1)
    assert "fired-up" in passion_label(0.9)


def test_dna_all_pass():
    d = evaluate_dna(
        "Your framework is a $20 API call.",
        "See it run. quantumtools.ai",
        "Your framework is a $20 API call. The problem is speed. PRISM fixes it. See it run.",
        product="PRISM",
    )
    assert all(c["ok"] for c in d)


def test_dna_flags_missing_and_pushy():
    d = evaluate_dna("", "", "BUY NOW 🔥 limited time", product="PRISM")
    by = {c["label"]: c["ok"] for c in d}
    assert by["Has a hook"] is False
    assert by["Subtle sell woven in"] is False   # product not referenced
    assert by["Soft, not pushy"] is False        # pushy phrases present
