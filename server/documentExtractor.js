import officeParser from "officeparser";
import path from "path";

const DOCUMENT_EXTENSIONS = new Set([".pptx", ".pdf", ".docx", ".doc", ".odt", ".odp", ".ods"]);
const STRUCTURED_EXTENSIONS = new Set([".xlsx", ".xls", ".csv"]);

export function isDocumentFile(filename) {
  return DOCUMENT_EXTENSIONS.has(path.extname(filename).toLowerCase());
}

export function isStructuredFile(filename) {
  return STRUCTURED_EXTENSIONS.has(path.extname(filename).toLowerCase());
}

export async function extractText(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const text = await officeParser.parseOfficeAsync(filePath);
  return {
    text: text || "",
    charCount: (text || "").length,
    fileType: ext,
  };
}
