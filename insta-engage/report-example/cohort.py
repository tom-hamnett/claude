"""Cohort rule: which example report a lead gets.

  * subject headcount < threshold (default 5,000)  -> whole-company view (Template A)
  * subject headcount >= threshold                  -> function view (Template B) for the
    function the lead cares about (from their interest or role)
  * a lead whose interest is the whole company gets Template A at any size

Smaller companies are best shown whole (functions are too thin to benchmark);
large ones read better one function at a time.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

DEFAULT_THRESHOLD = 5000
WHOLE = "whole_company"
FUNCTION = "function"
DEFAULT_FUNCTION = "procurement"
SUPPORTED_FUNCTIONS = ("procurement", "finance", "hr", "it")
WHOLE_WORDS = {"whole_company", "whole company", "company", "organisation", "organization", "workforce", "all", "ceo", "board"}

# role / interest words -> function pack
FUNCTION_HINTS = {
    "procurement": ["procure", "purchas", "sourcing", "buyer", "supplier", "category manager", "cpo", "supply chain"],
    "finance": ["financ", "fp&a", "cfo", "account", "controller", "treasury", "tax", "audit"],
    "hr": ["hr", "human resources", "people", "talent", "recruit", "chro", "reward", "payroll"],
    "it": ["head of it", "it director", "it manager", "information technology", "technology", "cio", "cto", "infrastructure", "engineering", "devops", "security", "data"],
}


def normalise_function(interest: str | None) -> str | None:
    """Map free text ('Head of FP&A', 'procurement') to a function pack, None if unclear,
    or WHOLE if the interest is the whole company."""
    if not interest:
        return None
    t = f" {interest.strip().lower()} "
    if t.strip() in WHOLE_WORDS:
        return WHOLE
    if t.strip() in SUPPORTED_FUNCTIONS:
        return t.strip()
    for fn, hints in FUNCTION_HINTS.items():
        for h in hints:
            if (re.search(rf"\b{re.escape(h.strip())}\b", t) if len(h.strip()) <= 3 else h in t):
                return fn
    return None


def choose_view(staff: float, interest_function: str | None = None, threshold: int = DEFAULT_THRESHOLD) -> dict:
    """Return {'view': 'whole_company'|'function', 'function': str|None, 'reason': str}.

    staff is the subject's total headcount (people, not thousands)."""
    fn = normalise_function(interest_function)
    if fn == WHOLE:
        return {"view": WHOLE, "function": None, "reason": "lead is interested in the whole company"}
    if staff < threshold:
        return {"view": WHOLE, "function": None,
                "reason": f"headcount {staff:,.0f} < {threshold:,}: whole-company view"}
    fn = fn or DEFAULT_FUNCTION
    return {"view": FUNCTION, "function": fn,
            "reason": f"headcount {staff:,.0f} >= {threshold:,}: {fn} function view"}


def check_blocklist(request: dict, path: str | Path | None = None) -> list[str]:
    """Names in the request that the sector guardrail blocks (empty list = OK)."""
    path = Path(path or Path(__file__).with_name("blocklist.json"))
    bl = json.loads(path.read_text())
    hits = []
    sector_text = " ".join(str(v) for v in request.get("sector", {}).values()).lower()
    for word in bl.get("blocked_sectors", []):
        if re.search(rf"\b{re.escape(word.lower())}\b", sector_text):
            hits.append(f"sector '{word}'")
    names = [request["subject"]["name"], request["subject"].get("short", "")] + [p["name"] for p in request.get("peers", [])]
    for n in filter(None, names):
        low = n.lower()
        for c in bl.get("blocked_companies", []):
            if re.search(rf"(?<![a-z]){re.escape(c.lower())}(?![a-z])", low):
                hits.append(f"company '{n}' (matches '{c}')")
        for word in bl.get("blocked_sectors", []):
            if re.search(rf"\b{re.escape(word.lower())}\b", low):
                hits.append(f"company '{n}' (sector word '{word}')")
    return hits
