/**
 * Tiny, dependency-free Markdown renderer. Handles the subset the FLUX AI emits:
 * headings, bold, inline code, bullet/numbered lists, tables, blockquotes and
 * paragraphs. Not a general parser — deliberately small and safe (no raw HTML).
 */
import { Fragment, type ReactNode } from 'react';

function inline(text: string, keyBase: string): ReactNode[] {
  // Split on **bold** and `code` while keeping delimiters.
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter((p) => p !== '');
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={`${keyBase}-${i}`}>{p.slice(2, -2)}</strong>;
    if (p.startsWith('`') && p.endsWith('`')) return <code key={`${keyBase}-${i}`}>{p.slice(1, -1)}</code>;
    return <Fragment key={`${keyBase}-${i}`}>{p}</Fragment>;
  });
}

export default function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r/g, '').split('\n');
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Tables: header | --- | rows
    if (line.includes('|') && lines[i + 1]?.match(/^\s*\|?[\s:|-]+\|?\s*$/)) {
      const header = splitRow(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].includes('|')) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      out.push(
        <table key={key++}>
          <thead>
            <tr>{header.map((h, hi) => <th key={hi}>{inline(h, `th${key}-${hi}`)}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri}>{r.map((c, ci) => <td key={ci}>{inline(c, `td${key}-${ri}-${ci}`)}</td>)}</tr>
            ))}
          </tbody>
        </table>,
      );
      continue;
    }

    if (line.startsWith('### ')) {
      out.push(<h3 key={key++}>{inline(line.slice(4), `h3${key}`)}</h3>);
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      out.push(<h2 key={key++}>{inline(line.slice(3), `h2${key}`)}</h2>);
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      out.push(<h1 key={key++}>{inline(line.slice(2), `h1${key}`)}</h1>);
      i++;
      continue;
    }
    if (line.startsWith('> ')) {
      out.push(
        <blockquote key={key++} className="border-l-4 border-brand-200 pl-3 text-ink-500 italic my-2">
          {inline(line.slice(2), `bq${key}`)}
        </blockquote>,
      );
      i++;
      continue;
    }
    if (line.match(/^\s*[-*]\s+/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\s*[-*]\s+/)) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      out.push(<ul key={key++}>{items.map((it, ii) => <li key={ii}>{inline(it, `li${key}-${ii}`)}</li>)}</ul>);
      continue;
    }
    if (line.match(/^\s*\d+\.\s+/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\s*\d+\.\s+/)) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      out.push(<ol key={key++}>{items.map((it, ii) => <li key={ii}>{inline(it, `ol${key}-${ii}`)}</li>)}</ol>);
      continue;
    }
    if (line.trim() === '' ) {
      i++;
      continue;
    }
    if (line.trim() === '---') {
      out.push(<hr key={key++} className="my-4 border-ink-100" />);
      i++;
      continue;
    }
    // paragraph (gather consecutive non-blank, non-special lines)
    const para: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('#') &&
      !lines[i].match(/^\s*[-*]\s+/) &&
      !lines[i].match(/^\s*\d+\.\s+/) &&
      !lines[i].includes('|')
    ) {
      para.push(lines[i]);
      i++;
    }
    out.push(<p key={key++}>{inline(para.join(' '), `p${key}`)}</p>);
  }

  return <div className="prose-flux">{out}</div>;
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim());
}
