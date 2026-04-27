/**
 * Hero halo orb — a Theo-coded visual: obsidian helmet sphere with three
 * disconnected halos rotating in impossible physics. Used in the hero only;
 * the rest of the page stays restrained.
 */
export function Halo() {
  return (
    <div className="relative w-[260px] h-[260px] md:w-[320px] md:h-[320px] mx-auto select-none" aria-hidden>
      {/* Glow */}
      <div
        className="absolute inset-0 rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(closest-side, rgba(108,99,255,0.45), rgba(255,209,102,0.18) 60%, transparent 75%)',
        }}
      />
      {/* Halos */}
      <div className="absolute inset-4 rounded-full border border-brand-300/40 animate-haloA" style={{ transform: 'rotate(20deg) translateX(2px)' }} />
      <div className="absolute inset-8 rounded-full border border-gold-200/30 animate-haloB" style={{ transform: 'rotate(-30deg)' }} />
      <div className="absolute inset-12 rounded-full border border-brand-200/30 animate-haloA" style={{ transform: 'rotate(60deg)', animationDuration: '18s' }} />
      {/* Obsidian core */}
      <div className="absolute inset-[18%] rounded-full bg-gradient-to-br from-bg-700 via-bg-900 to-black border border-white/10 shadow-glow flex items-center justify-center">
        <span className="font-display text-6xl md:text-7xl text-ink-50">Σ</span>
      </div>
      {/* Highlight crescent */}
      <div
        className="absolute inset-[18%] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(at 30% 25%, rgba(255,255,255,0.25), transparent 35%), radial-gradient(at 80% 75%, rgba(108,99,255,0.45), transparent 40%)',
          mixBlendMode: 'screen',
        }}
      />
    </div>
  );
}
