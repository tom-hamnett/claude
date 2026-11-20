"""pytest for the example-report generator. Run: pytest insta-engage/report-example -q

The build tests need the real template decks in report-example/templates/ (git-ignored);
they are skipped when the decks are absent."""

import json
import shutil
import sys
import zipfile
from pathlib import Path

import pytest

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))

from cohort import check_blocklist, choose_view, normalise_function  # noqa: E402
from make_example_report import REDACT, build, leak_check, redact_numbers  # noqa: E402

TEMPLATE_B = HERE / "templates" / "template_b.pptx"
PROFILE_B = json.loads((HERE / "profiles" / "template_b_procurement.json").read_text())
REQ_B = json.loads((HERE / "requests" / "demo_atlassian_procurement.json").read_text())


# ---- redaction ----

def test_redacts_numbers_keeps_units_and_markers():
    out = redact_numbers("IHG runs 73 vs 60 FTE per $bn (1), cost $27.4m, 21% heavier, page 5/24, FY2025 10-K")
    assert "73" not in out and "60" not in out and "27.4" not in out and "21" not in out
    assert f"${REDACT}m" in out and f"{REDACT}%" in out
    assert "(1)" in out and "5/24" in out and "FY2025" in out and "10-K" in out


def test_redaction_leaves_no_digits_outside_protected():
    out = redact_numbers("142 found, about 179 estimated, 142–191; 1,026k rooms; 0.9x")
    assert not any(ch.isdigit() for ch in out)


# ---- cohort rule ----

def test_small_company_gets_whole_company():
    assert choose_view(3000)["view"] == "whole_company"


def test_large_company_gets_function_from_role():
    r = choose_view(12000, "Head of FP&A")
    assert r == {**r, "view": "function", "function": "finance"}


def test_large_company_defaults_to_procurement():
    assert choose_view(20000)["function"] == "procurement"


def test_whole_company_interest_overrides_size():
    assert choose_view(50000, "whole company")["view"] == "whole_company"


def test_threshold_is_configurable():
    assert choose_view(3000, "procurement", threshold=2000)["view"] == "function"


def test_function_hints():
    assert normalise_function("Category Manager, indirect") == "procurement"
    assert normalise_function("Talent acquisition partner") == "hr"
    assert normalise_function("making a case for it") is None  # bare 'it' is not IT


# ---- guardrail ----

def test_blocklist_mechanism_refuses_listed_names(tmp_path):
    bl = tmp_path / "bl.json"
    bl.write_text('{"blocked_sectors": ["tobacco"], "blocked_companies": ["Acme"]}')
    assert check_blocklist({"subject": {"name": "Asana"}, "peers": [{"name": "Acme"}], "sector": {}}, bl)
    assert check_blocklist({"subject": {"name": "Asana"}, "peers": [], "sector": {"label": "tobacco firms"}}, bl)


def test_default_blocklist_is_empty_every_company_at_face_value():
    hotel = {"subject": {"name": "IHG Hotels & Resorts"}, "peers": [{"name": "Hilton"}], "sector": {"label": "hotel groups"}}
    assert check_blocklist(hotel) == []


def test_blocklist_allows_saas():
    assert check_blocklist(REQ_B) == []


# ---- leak check ----

needs_template = pytest.mark.skipif(not TEMPLATE_B.exists(), reason="template deck not present")


@needs_template
def test_build_passes_leak_check(tmp_path):
    out = tmp_path / "ok.pptx"
    build(str(TEMPLATE_B), PROFILE_B, dict(REQ_B, function="procurement"), str(out))
    assert out.exists()


@needs_template
def test_leak_check_catches_planted_name(tmp_path):
    out = tmp_path / "ok.pptx"
    build(str(TEMPLATE_B), PROFILE_B, dict(REQ_B, function="procurement"), str(out))
    bad = tmp_path / "bad.pptx"
    with zipfile.ZipFile(out) as zin, zipfile.ZipFile(bad, "w") as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == "ppt/slides/slide5.xml":
                data = data.replace(b"<a:t>", b"<a:t>Hilton ", 1)
            zout.writestr(item, data)
    with pytest.raises(SystemExit, match="Hilton"):
        leak_check(str(bad), PROFILE_B, REQ_B)


@needs_template
def test_leak_check_catches_planted_number(tmp_path):
    out = tmp_path / "ok.pptx"
    build(str(TEMPLATE_B), PROFILE_B, dict(REQ_B, function="procurement"), str(out))
    bad = tmp_path / "bad.pptx"
    with zipfile.ZipFile(out) as zin, zipfile.ZipFile(bad, "w") as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == "ppt/slides/slide5.xml":
                data = data.replace(b"<a:t>", b"<a:t>179 FTE ", 1)
            zout.writestr(item, data)
    with pytest.raises(SystemExit, match="unredacted number"):
        leak_check(str(bad), PROFILE_B, REQ_B)
