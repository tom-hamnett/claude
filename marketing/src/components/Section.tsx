import type { ReactNode } from 'react';

export function Section({
  id,
  eyebrow,
  title,
  lede,
  children,
  align = 'left',
  bg = 'default',
}: {
  id?: string;
  eyebrow?: string;
  title?: ReactNode;
  lede?: ReactNode;
  children?: ReactNode;
  align?: 'left' | 'center';
  bg?: 'default' | 'panel' | 'pop';
}) {
  const bgClass =
    bg === 'panel'
      ? 'bg-bg-800/60 border-y border-white/10'
      : bg === 'pop'
      ? 'bg-gradient-to-b from-brand-900/40 via-bg-800/40 to-bg-900/0 border-y border-white/10'
      : '';
  return (
    <section id={id} className={`relative py-20 md:py-28 ${bgClass}`}>
      <div className="container-w">
        {(eyebrow || title || lede) && (
          <div className={`max-w-2xl ${align === 'center' ? 'mx-auto text-center' : ''}`}>
            {eyebrow ? <div className="h-eyebrow mb-3">{eyebrow}</div> : null}
            {title ? (
              <h2 className="h-display text-3xl md:text-5xl leading-[1.05] mb-4">{title}</h2>
            ) : null}
            {lede ? (
              <p className="text-lg md:text-xl text-ink-200 leading-relaxed">{lede}</p>
            ) : null}
          </div>
        )}
        {children ? <div className={eyebrow || title || lede ? 'mt-12' : ''}>{children}</div> : null}
      </div>
    </section>
  );
}
