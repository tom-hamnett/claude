const MONTH_MAP = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  january: 1, february: 2, march: 3, april: 4, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };

function monthToNum(s) { return MONTH_MAP[s.toLowerCase()] || 1; }

function guessYear(month) {
  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const curYear = now.getFullYear();
  return (month > curMonth + 2) ? curYear - 1 : curYear;
}

function pad(n) { return String(n).padStart(2, "0"); }

const PATH_RULES = [
  { pattern: /1\.\s*Weekly PLT Updates/i, doc_type: "weekly", audience_level: "operational" },
  { pattern: /Monthly Update Decks/i, doc_type: "monthly", audience_level: "management" },
  { pattern: /APRIL SNAPSHOT/i, doc_type: "monthly", audience_level: "management" },
  { pattern: /Audit Tracking|Audit Context/i, doc_type: "audit", audience_level: "management" },
  { pattern: /Working Docs/i, doc_type: "draft", audience_level: "operational" },
  { pattern: /Metrics|Monthly Risk Logs/i, doc_type: "metrics", audience_level: "operational" },
  { pattern: /SteerCo\s*Decks/i, doc_type: "steerco", audience_level: "board" },
  { pattern: /QBR/i, doc_type: "qbr", audience_level: "board" },
  { pattern: /99\.?\s*Older_Reports/i, doc_type: "other", audience_level: "management" },
  { pattern: /2\.\s*Monthly PLT Updates/i, doc_type: "monthly", audience_level: "management" },
  { pattern: /Sources\//i, doc_type: "source", audience_level: "operational" },
];

function extractDocDate(filename) {
  const basename = filename.split("/").pop();

  const wcMatch = basename.match(/wc(\d{1,2})\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)/i);
  if (wcMatch) {
    const day = parseInt(wcMatch[1]);
    const month = monthToNum(wcMatch[2]);
    const year = guessYear(month);
    return `${year}-${pad(month)}-${pad(day)}`;
  }

  const fullMonthMatch = basename.match(/(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\s*(\d{4})?/i);
  if (fullMonthMatch) {
    const month = monthToNum(fullMonthMatch[1]);
    const year = fullMonthMatch[2] ? parseInt(fullMonthMatch[2]) : guessYear(month);
    return `${year}-${pad(month)}-01`;
  }

  const abbrMatch = basename.match(/\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\b[\s_-]*(\d{4})?/i);
  if (abbrMatch) {
    const month = monthToNum(abbrMatch[1]);
    const year = abbrMatch[2] ? parseInt(abbrMatch[2]) : guessYear(month);
    return `${year}-${pad(month)}-01`;
  }

  const isoMatch = basename.match(/(\d{4})-(\d{2})(?:-(\d{2}))?/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3] || "01"}`;

  // Check folder path for year
  const pathYearMatch = filename.match(/\b(202[0-9])\b/);
  if (pathYearMatch) return `${pathYearMatch[1]}-01-01`;

  return null;
}

export function classifyDocument(filename) {
  let doc_type = "other";
  let audience_level = "operational";

  for (const rule of PATH_RULES) {
    if (rule.pattern.test(filename)) {
      doc_type = rule.doc_type;
      audience_level = rule.audience_level;
      break;
    }
  }

  const doc_date = extractDocDate(filename);
  return { doc_type, doc_date, audience_level };
}

export function refreshIsLatest(db, programmeId) {
  db.prepare("UPDATE document_texts SET is_latest = 0 WHERE programme_id = ?").run(programmeId);

  const types = db.prepare(
    "SELECT DISTINCT doc_type FROM document_texts WHERE programme_id = ? AND doc_type != 'other'"
  ).all(programmeId);

  for (const { doc_type } of types) {
    const latest = db.prepare(
      `SELECT id FROM document_texts WHERE programme_id = ? AND doc_type = ? ORDER BY COALESCE(doc_date, updated_at) DESC LIMIT 1`
    ).get(programmeId, doc_type);
    if (latest) {
      db.prepare("UPDATE document_texts SET is_latest = 1 WHERE id = ?").run(latest.id);
    }
  }
}
