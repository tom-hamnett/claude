/** @type {import('tailwindcss').Config}
 *
 * Locked Quantum Tools brand palette per MASTER_CONTEXT.md.
 * Vantablack background, QT purple primary, gold accents, hot coral for danger.
 * Typography: Playfair Display headings, DM Sans body.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0a0a0f',
          900: '#0a0a0f',
          800: '#11111a',
          700: '#181826',
          600: '#1f1f30',
          500: '#262638',
        },
        ink: {
          50:  '#f7f7fa',
          100: '#e8e8f0',
          200: '#c8c8d4',
          300: '#9c9cae',
          400: '#74748a',
          500: '#525266',
          600: '#3a3a4a',
          700: '#262633',
          800: '#181822',
          900: '#0e0e16',
        },
        brand: {
          50:  '#f3f1ff',
          100: '#e6e3ff',
          200: '#cbc6ff',
          300: '#a89eff',
          400: '#8a7dff',
          500: '#6c63ff',
          600: '#5448e6',
          700: '#4339b8',
          800: '#352c93',
          900: '#241d68',
        },
        gold: {
          50:  '#fff8e6',
          100: '#ffefc0',
          200: '#ffe28a',
          300: '#ffd166',
          400: '#f4b73a',
          500: '#d99a18',
          600: '#a67712',
          700: '#74540c',
        },
        hot: {
          400: '#ff8a8a',
          500: '#ff6b6b',
          600: '#e64d4d',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(108, 99, 255, 0.4), 0 18px 60px -20px rgba(108, 99, 255, 0.55)',
        gold: '0 0 0 1px rgba(255, 209, 102, 0.4), 0 18px 60px -20px rgba(255, 209, 102, 0.5)',
        soft: '0 1px 2px rgba(0, 0, 0, 0.5)',
      },
      backgroundImage: {
        'grid-faint':
          'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
        'noise':
          'url("data:image/svg+xml;utf8,<svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"180\\" height=\\"180\\"><filter id=\\"n\\"><feTurbulence type=\\"fractalNoise\\" baseFrequency=\\"0.85\\" numOctaves=\\"2\\" stitchTiles=\\"stitch\\"/><feColorMatrix values=\\"0 0 0 0 1   0 0 0 0 1   0 0 0 0 1   0 0 0 0.06 0\\"/></filter><rect width=\\"100%\\" height=\\"100%\\" filter=\\"url(%23n)\\"/></svg>")',
      },
      keyframes: {
        floaty: {
          '0%, 100%': { transform: 'translateY(0) rotate(0)' },
          '50%': { transform: 'translateY(-6px) rotate(0.5deg)' },
        },
        haloA: {
          '0%, 100%': { transform: 'rotate(0deg) translateX(0) scale(1)' },
          '50%': { transform: 'rotate(180deg) translateX(2px) scale(1.05)' },
        },
        haloB: {
          '0%, 100%': { transform: 'rotate(0deg) scale(1)' },
          '50%': { transform: 'rotate(-180deg) scale(0.95)' },
        },
      },
      animation: {
        floaty: 'floaty 8s ease-in-out infinite',
        haloA: 'haloA 14s linear infinite',
        haloB: 'haloB 22s linear infinite reverse',
      },
    },
  },
  plugins: [],
};
