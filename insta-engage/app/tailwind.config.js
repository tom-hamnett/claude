/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#131A24', soft: '#515C6C', faint: '#808B9B' },
        paper: '#EEF1F6',
        surface: '#FBFCFE',
        line: '#D5DBE6',
        brand: { DEFAULT: '#1A6B5C', soft: '#E1F0EC', dark: '#0F4A3F' },
        navy: '#131A24',
        signal: { DEFAULT: '#D8891F', soft: '#F8ECD6' },
        danger: '#B3392B',
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        display: ['Archivo', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
