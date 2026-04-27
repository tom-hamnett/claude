import type { ReactNode } from 'react';

/**
 * Tiny dependency-free markdown renderer for AI-drafted reports.
 *
 * Supports the subset we care about for assessment narratives:
 *   # / ## / ### headings
 *   - bullet lists
 *   1. numbered lists
 *   **bold** *italic* `code`
 *   blank-line paragraph breaks
 *
 * Anything else falls back to a plain paragraph. We deliberately don't pull in
 * a full markdown library — a 30-line parser is plenty for a 350-word AI draft
 * and keeps the bundle tight.
 */
export function Markdown({ source, className = '' }: { source: string; className?: string }) {
  const blocks = parseBlocks(source);
  return (
    <div className={`space-y-3 leading-relaxed text-ink-700 ${className}`}>
      {blocks.map((b, i) => renderBlock(b, i))}
    </div>
  );
}

type Block =
  | { kind: 'h'; level: 1 | 2 | 3; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'p'; text: string };

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const h = /^(#{1,3})\s+(.+)$/.exec(line);
    if (h) {
      blocks.push({ kind: 'h', level: h[1].length as 1 | 2 | 3, text: h[2].trim() });
      i++;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, '').trim());
        i++;
      }
      blocks.push({ kind: 'ul', items });
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, '').trim());
        i++;
      }
      blocks.push({ kind: 'ol', items });
      continue;
    }
    // Paragraph: collect lines until blank or special prefix.
    const para: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push({ kind: 'p', text: para.join(' ').trim() });
  }
  return blocks;
}

function renderBlock(b: Block, key: number): ReactNode {
  switch (b.kind) {
    case 'h': {
      const cls =
        b.level === 1
          ? 'text-2xl font-extrabold text-ink-800 mt-1'
          : b.level === 2
          ? 'text-lg font-bold text-ink-800 mt-2'
          : 'text-base font-bold text-ink-800 mt-2';
      return (
        <div key={key} className={cls}>
          {renderInline(b.text)}
        </div>
      );
    }
    case 'ul':
      return (
        <ul key={key} className="list-disc pl-5 space-y-1 marker:text-brand-400">
          {b.items.map((it, j) => (
            <li key={j}>{renderInline(it)}</li>
          ))}
        </ul>
      );
    case 'ol':
      return (
        <ol key={key} className="list-decimal pl-5 space-y-1 marker:text-brand-400">
          {b.items.map((it, j) => (
            <li key={j}>{renderInline(it)}</li>
          ))}
        </ol>
      );
    case 'p':
      return (
        <p key={key} className="text-ink-700">
          {renderInline(b.text)}
        </p>
      );
  }
}

/** Tokenise a single line for **bold**, *italic*, `code`. */
function renderInline(src: string): ReactNode {
  const out: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(src)) !== null) {
    if (m.index > lastIdx) out.push(src.slice(lastIdx, m.index));
    if (m[2] !== undefined) out.push(<strong key={key++} className="font-bold text-ink-800">{m[2]}</strong>);
    else if (m[3] !== undefined) out.push(<em key={key++}>{m[3]}</em>);
    else if (m[4] !== undefined) out.push(<code key={key++} className="px-1 py-0.5 rounded bg-ink-100 text-ink-800 text-[0.9em] font-mono">{m[4]}</code>);
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < src.length) out.push(src.slice(lastIdx));
  return out;
}
