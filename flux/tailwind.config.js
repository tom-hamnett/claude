/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Quantum Tools indigo — primary brand accent.
        brand: {
          50: '#f3f1ff',
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
        // FLUX cyan — the "execution intelligence" signal colour.
        flux: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },
        // Value-classification palette (Lean): value-add / business-non-value-add / waste.
        va: { 100: '#dcfce7', 500: '#22c55e', 600: '#16a34a', 700: '#15803d' },
        bva: { 100: '#fef3c7', 500: '#f59e0b', 600: '#d97706', 700: '#b45309' },
        nva: { 100: '#fee2e2', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c' },
        ink: {
          50: '#f7f8fb',
          100: '#eef0f5',
          200: '#dce0eb',
          300: '#b6bdcf',
          400: '#7d8699',
          500: '#525a6c',
          600: '#363c4d',
          700: '#262a37',
          800: '#181b25',
          900: '#0e1018',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(16, 24, 40, 0.06), 0 1px 3px rgba(16, 24, 40, 0.10)',
        lift: '0 8px 24px rgba(16, 24, 40, 0.10)',
        glow: '0 0 0 4px rgba(108, 99, 255, 0.18)',
      },
    },
  },
  plugins: [],
};
