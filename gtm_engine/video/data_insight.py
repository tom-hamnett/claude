"""Data-analysis step — turn a real spreadsheet into an insight + proof charts.

This is the "the idea comes from the data" layer for Insight/Proof reels. The user
attaches a CSV/XLSX (it lands in the Data Vault); this module reads the actual cells,
asks Claude to find the insight and express it as chart specs bound to the real
numbers, and attaches those charts to the reel. The choreographer then binds proof
beats to these real charts instead of inventing numbers from the script wording.

Flow:
  ingest_data_file(path) -> Data Vault source (content = the table as text)
  analyze_for_job(job_id) -> {insight, headline, angle}; stores job.data_charts
"""

import csv
import io
import json
import logging

logger = logging.getLogger(__name__)

MAX_ROWS_IN_PROMPT = 60      # keep the prompt bounded on big sheets
MAX_CHARTS = 5


def read_tabular(path: str) -> tuple[list[str], list[list]]:
    """Read a CSV or XLSX file into (columns, rows). Empty on failure."""
    from pathlib import Path
    p = Path(path)
    if not p.exists():
        return [], []
    try:
        if p.suffix.lower() in (".xlsx", ".xlsm", ".xltx"):
            import openpyxl
            wb = openpyxl.load_workbook(p, read_only=True, data_only=True)
            ws = wb.active
            rows = [[("" if c is None else c) for c in r]
                    for r in ws.iter_rows(values_only=True)]
            wb.close()
        else:  # csv / tsv / txt
            text = p.read_text(errors="ignore")
            delim = "\t" if (p.suffix.lower() == ".tsv" or "\t" in text[:2000]) else ","
            rows = list(csv.reader(io.StringIO(text), delimiter=delim))
    except Exception as e:
        logger.info("read_tabular failed for %s: %s", path, e)
        return [], []
    rows = [r for r in rows if any(str(c).strip() for c in r)]   # drop blank rows
    if not rows:
        return [], []
    header = [str(c).strip() for c in rows[0]]
    return header, rows[1:]


def table_to_text(columns: list[str], rows: list[list], max_rows: int = MAX_ROWS_IN_PROMPT) -> str:
    """Compact CSV-ish rendering for the prompt: header + first/last rows + row count."""
    if not columns:
        return ""
    out = [", ".join(columns)]
    n = len(rows)
    if n <= max_rows:
        shown = rows
    else:
        head = rows[: max_rows - 10]
        tail = rows[-10:]
        shown = head + [["…"]] + tail
    for r in shown:
        out.append(", ".join(str(c) for c in r))
    out.append(f"[{n} data rows total]")
    return "\n".join(out)


def ingest_data_file(path: str, name: str = "", related_products: list[str] | None = None) -> int | None:
    """Read a spreadsheet into the Data Vault as a dataset source. Returns source id."""
    from pathlib import Path
    from gtm_engine.data_vault import DataVault, DataSource
    cols, rows = read_tabular(path)
    if not cols:
        return None
    content = table_to_text(cols, rows, max_rows=500)   # store more than we prompt with
    src = DataSource(
        name=name or Path(path).stem,
        description=f"Uploaded spreadsheet · {len(rows)} rows × {len(cols)} cols",
        source_type="dataset",
        content=content,
        related_products=related_products or [],
        freshness="uploaded",
    )
    return DataVault().create(src)


def attach_data_to_idea(idea_id: int, file_path: str, name: str = "") -> tuple[int | None, str]:
    """Ingest a spreadsheet into the Data Vault and tag it to an IDEA (upstream of the
    script). Returns (source_id, message). The script generator then builds from it,
    and the reel inherits the source to make its charts."""
    from gtm_engine.ideas import IdeaBank
    sid = ingest_data_file(file_path, name=name)
    if not sid:
        return None, "Couldn't read that file — is it a CSV or XLSX with a header row?"
    IdeaBank().set_demo_setup(idea_id, data_source_id=sid)
    return sid, "Data tagged to this idea — the script will be written from these real numbers."


def idea_data_text(idea_id: int, max_rows: int = 40) -> str:
    """The tagged data source's table text for an idea, bounded for a prompt. '' if none."""
    from gtm_engine.ideas import IdeaBank
    from gtm_engine.data_vault import DataVault
    idea = IdeaBank().get(idea_id)
    if not idea or not idea.data_source_id:
        return ""
    src = DataVault().get(idea.data_source_id)
    if not src or not (src.content or "").strip():
        return ""
    # src.content is already table-shaped text; trim to a bounded number of lines.
    lines = src.content.splitlines()
    if len(lines) > max_rows + 2:
        lines = lines[:max_rows] + ["…", lines[-1]]
    return "\n".join(lines)


_SYSTEM = """You are a data analyst preparing PROOF VISUALS for a short vertical video about a
data product. You are given a real table. Find the most compelling, honest insight in it and
express it as a small set of chart specs bound to the REAL numbers in the table. Transparency
is the brand — include the uncomfortable figure (a drawdown, a losing stretch) if it's there.

Return ONLY JSON:
{
  "insight": "<one sharp sentence — the finding a viewer should leave with>",
  "headline": "<≤ 7 words, the on-screen version>",
  "angle": "<how a reel could open on this — one line>",
  "charts": [ <chart_spec>, ... ]        // 2–5, ordered most-important first
}
Each chart_spec is exactly one of:
  {"chart_type":"stat","value":"-11.4%","label":"MAX DRAWDOWN","sub":"<short context>"}
  {"chart_type":"bar","title":"<title>","unit":"%","bars":[{"label":"A","value":34.2},{"label":"B","value":11.0}]}
  {"chart_type":"line","title":"<title>","series":[100,103,101,...],"note":"<short>"}
  {"chart_type":"table","title":"<title>","rows":[["Week 12","+2.3%"],["Week 13","-1.1%"]]}
Rules: use ONLY numbers present in (or directly computed from) the table — never invent figures.
Prefer one headline "stat", one "line" for any trend/series, one "bar" for a comparison, and a
short "table" for a ledger. Keep labels short and muted-friendly."""


def analyze_table(table_text: str, product: str = "", angle: str = "") -> dict:
    """Ask Claude for the insight + chart specs. Returns {} on failure."""
    if not table_text.strip():
        return {}
    from gtm_engine.utils.ai_client import call_claude
    from gtm_engine.video.dataviz import clean_spec
    prompt = (
        f"PRODUCT: {product or 'a data product'}\n"
        f"DESIRED ANGLE (optional): {angle or '(none — find the strongest)'}\n\n"
        f"TABLE:\n{table_text}\n\nReturn ONLY the JSON."
    )
    raw = call_claude(prompt, system=_SYSTEM, max_tokens=1500)
    s, e = raw.find("{"), raw.rfind("}")
    try:
        data = json.loads(raw[s:e + 1]) if s != -1 and e != -1 else {}
    except Exception:
        return {}
    charts = []
    for i, spec in enumerate(data.get("charts") or []):
        cs = clean_spec(spec)
        if cs:
            charts.append({"id": f"d{i}", "spec": cs})
        if len(charts) >= MAX_CHARTS:
            break
    return {
        "insight": (data.get("insight") or "").strip(),
        "headline": (data.get("headline") or "").strip(),
        "angle": (data.get("angle") or "").strip(),
        "charts": charts,
    }


def analyze_for_job(job_id: int) -> dict:
    """Run the data step for a reel: read its data source, analyse, store charts.
    Returns {insight, headline, angle, n_charts}. No-op (empty) if no source/data."""
    from gtm_engine.video import VideoJobStore
    from gtm_engine.data_vault import DataVault
    from gtm_engine.ideas import IdeaBank
    store = VideoJobStore()
    job = store.get(job_id)
    if not job or not job.data_source_id:
        return {}
    src = DataVault().get(job.data_source_id)
    if not src or not (src.content or "").strip():
        return {}
    idea = IdeaBank().get(job.idea_id)
    product = (idea.product if idea else "") or ""
    res = analyze_table(src.content, product=product)
    if not res.get("charts"):
        return {}
    job.data_charts = res["charts"]
    # Stash the insight/headline in assembly_json so the UI can show it and the
    # producer can seed the script from it.
    try:
        state = json.loads(job.assembly_json or "{}") or {}
    except Exception:
        state = {}
    state["data_insight"] = res.get("insight", "")
    state["data_headline"] = res.get("headline", "")
    state["data_angle"] = res.get("angle", "")
    job.assembly_json = json.dumps(state)
    store.save(job)
    return {"insight": res["insight"], "headline": res["headline"],
            "angle": res["angle"], "n_charts": len(res["charts"])}
