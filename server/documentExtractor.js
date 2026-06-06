import officeParser from "officeparser";
import AdmZip from "adm-zip";
import path from "path";

const DOCUMENT_EXTENSIONS = new Set([".pptx", ".pdf", ".docx", ".doc", ".odt", ".odp", ".ods"]);
const STRUCTURED_EXTENSIONS = new Set([".xlsx", ".xls", ".csv"]);

export function isDocumentFile(filename) {
  return DOCUMENT_EXTENSIONS.has(path.extname(filename).toLowerCase());
}

export function isStructuredFile(filename) {
  return STRUCTURED_EXTENSIONS.has(path.extname(filename).toLowerCase());
}

function parseOffice(filePath) {
  if (officeParser.parseOfficeAsync) return officeParser.parseOfficeAsync(filePath);
  return new Promise((resolve, reject) => {
    officeParser.parseOffice(filePath, (data, err) => {
      if (err) reject(err);
      else resolve(typeof data === "string" ? data : data ? String(data) : "");
    });
  });
}

function extractFromZip(filePath) {
  try {
    const zip = new AdmZip(filePath);
    const entries = zip.getEntries();
    const parts = [];
    for (const e of entries) {
      if (/ppt\/slides\/slide\d+\.xml|ppt\/notesSlides\/|word\/document\.xml/.test(e.entryName)) {
        const raw = e.getData().toString("utf-8");
        const text = raw.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#xD;/g, "\n").replace(/\s+/g, " ").trim();
        if (text.length > 10) parts.push(text);
      }
    }
    return parts.join("\n\n");
  } catch (_) { return ""; }
}

export async function extractText(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  let text = "";

  try {
    text = await parseOffice(filePath);
    if (typeof text !== "string") text = text ? String(text) : "";
  } catch (_) {}

  if (!text || text.trim().length < 50) {
    const xmlText = extractFromZip(filePath);
    if (xmlText.length > text.length) text = xmlText;
  }

  return {
    text: text || "",
    charCount: (text || "").length,
    fileType: ext,
  };
}
