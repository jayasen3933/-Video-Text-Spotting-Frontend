import defaultTheme from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', ...defaultTheme.fontFamily.sans],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: { '2xs': ['0.6875rem', { lineHeight: '1rem' }] },
      colors: {
        accent: {
          50: '#eff5ff',
          100: '#dbe7fe',
          500: '#3b6fe0',
          600: '#2a5bd0',
          700: '#2349a8',
        },
      },
    },
  },
  plugins: [],
};
