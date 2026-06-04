import type { SourceKind } from '../types';

/** Inline attachment ceiling — provider request limits sit around ~20MB. */
export const MAX_INLINE_BYTES = 18 * 1024 * 1024;

/** Sanity ceiling for browser-side handling; large media uploads to Gemini Files API. */
export const MAX_FILE_BYTES = 200 * 1024 * 1024;

/** Read a File into base64 (no data: prefix). */
export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsDataURL(file);
  });
}

export async function readFileAsText(file: File): Promise<string> {
  return file.text();
}

/** Classify a dropped file into a FLUX source kind. */
export function sourceKindFor(file: File): SourceKind {
  const mime = file.type;
  const name = file.name.toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'document';
  if (name.endsWith('.csv') || name.endsWith('.xlsx') || name.endsWith('.xls') || mime.includes('spreadsheet') || mime === 'text/csv') {
    return 'eventlog';
  }
  if (mime.startsWith('text/') || name.endsWith('.txt') || name.endsWith('.md')) return 'text';
  // Office docs and unknowns → treat as document (vision/extraction).
  return 'document';
}

export function humanSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Binary kinds are sent as attachments; text/eventlog are read as text. */
export function isBinaryKind(kind: SourceKind): boolean {
  return kind === 'document' || kind === 'image' || kind === 'audio' || kind === 'video';
}
