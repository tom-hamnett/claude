/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Quantum Tools purple — primary accent. Anchors Sigma to the QT house
        // while staying tonally legible against white/light surfaces in bright
        // outdoor light (building sites, school yards, sports pitches).
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
        // QT gold — used sparingly for upsells, warnings, premium features.
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
        // Coral for destructive / hot accents.
        hot: {
          50:  '#fff1f1',
          100: '#ffe0e0',
          400: '#ff8a8a',
          500: '#ff6b6b',
          600: '#e64d4d',
          700: '#b83a3a',
        },
        ink: {
          50:  '#f7f8fb',
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
        sans: ['"Inter"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
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
