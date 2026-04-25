/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef6ff',
          100: '#d9eaff',
          200: '#b7d7ff',
          300: '#86bbff',
          400: '#5093ff',
          500: '#2a6dff',
          600: '#1a52e0',
          700: '#173fb0',
          800: '#16358a',
          900: '#162f6e',
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
      },
      boxShadow: {
        soft: '0 1px 2px rgba(16, 24, 40, 0.06), 0 1px 3px rgba(16, 24, 40, 0.10)',
        lift: '0 8px 24px rgba(16, 24, 40, 0.10)',
      },
    },
  },
  plugins: [],
};
