import React from 'react';

/** Minimal, safe inline markdown: **bold**, *italic*, `code`. No raw HTML. */
export function inline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) nodes.push(<strong key={key++}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith('`')) nodes.push(<code key={key++}>{tok.slice(1, -1)}</code>);
    else nodes.push(<em key={key++}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** Render multi-line markdown text (paragraphs split on blank lines). */
export function Markdown({ text, className }: { text: string; className?: string }) {
  const paras = text.split(/\n{2,}/);
  return (
    <div className={className}>
      {paras.map((p, i) => (
        <p key={i} className="mb-3 last:mb-0 whitespace-pre-wrap">
          {p.split('\n').map((line, j) => (
            <React.Fragment key={j}>
              {j > 0 && <br />}
              {inline(line)}
            </React.Fragment>
          ))}
        </p>
      ))}
    </div>
  );
}
