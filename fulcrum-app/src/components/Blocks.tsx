import { useState } from 'react';
import type { Block } from '../types';
import { inline } from '../lib/markdown';

const CALLOUT: Record<string, { ring: string; bg: string; icon: string; label: string }> = {
  tip: { ring: 'border-teal-200', bg: 'bg-teal-50', icon: '💡', label: 'Tip' },
  warn: { ring: 'border-hot-200', bg: 'bg-hot-50', icon: '⚠️', label: 'Watch out' },
  key: { ring: 'border-brand-200', bg: 'bg-brand-50', icon: '🔑', label: 'Key idea' },
  example: { ring: 'border-gold-200', bg: 'bg-gold-50', icon: '🧭', label: 'Example' },
  mechanic: { ring: 'border-brand-200', bg: 'bg-gradient-to-br from-brand-50 to-white', icon: '⚙️', label: 'The mechanic' },
};

function P({ md }: { md: string }) {
  return <p className="mb-4 leading-relaxed text-ink-700">{inline(md)}</p>;
}

export function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case 'p':
      return <P md={block.md} />;
    case 'h':
      return <h3 className="font-display text-xl text-ink-900 mt-7 mb-3">{block.text}</h3>;
    case 'list':
      return block.ordered ? (
        <ol className="list-decimal pl-5 mb-4 space-y-1.5 text-ink-700">
          {block.items.map((it, i) => (
            <li key={i}>{inline(it)}</li>
          ))}
        </ol>
      ) : (
        <ul className="list-disc pl-5 mb-4 space-y-1.5 text-ink-700">
          {block.items.map((it, i) => (
            <li key={i}>{inline(it)}</li>
          ))}
        </ul>
      );
    case 'steps':
      return (
        <ol className="mb-4 space-y-2">
          {block.items.map((it, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex-none w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold grid place-items-center mt-0.5">
                {i + 1}
              </span>
              <span className="text-ink-700">{inline(it)}</span>
            </li>
          ))}
        </ol>
      );
    case 'callout': {
      const c = CALLOUT[block.tone];
      return (
        <div className={`rounded-2xl border ${c.ring} ${c.bg} p-4 my-4`}>
          <div className="flex items-center gap-2 mb-1.5">
            <span aria-hidden>{c.icon}</span>
            <span className="label">{block.title || c.label}</span>
          </div>
          <div className="text-ink-700 leading-relaxed whitespace-pre-line">{inline(block.md)}</div>
        </div>
      );
    }
    case 'quote':
      return (
        <blockquote className="border-l-4 border-brand-200 pl-4 italic text-ink-600 my-4">
          {inline(block.md)}
          {block.cite && <footer className="text-xs not-italic text-ink-400 mt-1">— {block.cite}</footer>}
        </blockquote>
      );
    case 'goodbad':
      return (
        <div className="overflow-hidden rounded-2xl border border-ink-100 my-4">
          <div className="grid grid-cols-2 text-[11px] font-semibold uppercase tracking-wide">
            <div className="bg-hot-50 text-hot-700 px-3 py-2">Reads as weak</div>
            <div className="bg-teal-50 text-teal-700 px-3 py-2">Reads as strong</div>
          </div>
          {block.rows.map((r, i) => (
            <div key={i} className="grid grid-cols-2 border-t border-ink-100 text-sm">
              <div className="px-3 py-2.5 bg-white">
                <div className="text-[11px] text-ink-400 mb-0.5">{r.dimension}</div>
                <div className="text-ink-700">{inline(r.poor)}</div>
              </div>
              <div className="px-3 py-2.5 bg-white border-l border-ink-100">
                <div className="text-[11px] text-ink-400 mb-0.5">{r.dimension}</div>
                <div className="text-ink-700">{inline(r.good)}</div>
              </div>
            </div>
          ))}
        </div>
      );
    case 'table':
      return (
        <div className="overflow-x-auto my-4 rounded-2xl border border-ink-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ink-50 text-left">
                {block.columns.map((c, i) => (
                  <th key={i} className="px-3 py-2 font-semibold text-ink-700">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} className="border-t border-ink-100">
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-2 text-ink-700 align-top">
                      {inline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'tryit':
      return (
        <div className="rounded-2xl border border-gold-200 bg-gold-50 p-4 my-4">
          <div className="flex items-center gap-2 mb-1.5">
            <span aria-hidden>✍️</span>
            <span className="label text-gold-700">Try it</span>
          </div>
          <div className="text-ink-700 leading-relaxed">{inline(block.md)}</div>
        </div>
      );
    case 'check':
      return <KnowledgeCheck block={block} />;
    default:
      return null;
  }
}

function KnowledgeCheck({ block }: { block: Extract<Block, { type: 'check' }> }) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-4 my-5">
      <div className="flex items-center gap-2 mb-2">
        <span aria-hidden>🧠</span>
        <span className="label text-brand-700">Knowledge check</span>
      </div>
      <p className="font-semibold text-ink-900 mb-3">{block.q}</p>
      <div className="space-y-2">
        {block.options.map((opt, i) => {
          const isPicked = picked === i;
          const reveal = picked !== null;
          const tone = reveal
            ? opt.correct
              ? 'border-teal-300 bg-teal-50'
              : isPicked
                ? 'border-hot-300 bg-hot-50'
                : 'border-ink-100 bg-white opacity-70'
            : 'border-ink-200 bg-white hover:border-brand-300';
          return (
            <button
              key={i}
              onClick={() => picked === null && setPicked(i)}
              disabled={picked !== null}
              className={`w-full text-left rounded-xl border ${tone} px-3 py-2.5 transition`}
            >
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-sm">
                  {reveal ? (opt.correct ? '✅' : isPicked ? '❌' : '○') : '○'}
                </span>
                <div>
                  <div className="text-ink-800 text-sm">{opt.text}</div>
                  {reveal && (isPicked || opt.correct) && (
                    <div className="text-xs text-ink-500 mt-1">{opt.why}</div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <div>
      {blocks.map((b, i) => (
        <BlockView key={i} block={b} />
      ))}
    </div>
  );
}
