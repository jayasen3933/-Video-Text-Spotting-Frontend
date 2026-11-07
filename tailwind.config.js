import defaultTheme from 'tailwindcss/defaultTheme';
import colors from 'tailwindcss/colors';
import plugin from 'tailwindcss/plugin';

/**
 * Theming: the palettes the UI uses (zinc, white, accent, red, amber, emerald) are CSS variables, so every
 * existing class (bg-white, text-zinc-500, ...) follows the theme without dark: variants. Dark mode swaps
 * each scale end for end (50 <-> 950), with the mid tones nudged for contrast on a dark background.
 * `ink` is fixed in both themes, for areas that are always dark (video letterbox, log panel).
 */
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
// light step -> step whose colour it takes in dark mode
const NEUTRAL_DARK = { 50: 950, 100: 900, 200: 800, 300: 700, 400: 500, 500: 400, 600: 300, 700: 200, 800: 100, 900: 50, 950: 50 };
const TINT_DARK = { 50: 950, 100: 900, 200: 800, 300: 700, 400: 400, 500: 500, 600: 400, 700: 300, 800: 200, 900: 100, 950: 50 };

const ACCENT_LIGHT = { 50: '#eff5ff', 100: '#dbe7fe', 200: '#bfd3fd', 300: '#93b4fa', 400: '#6391ef', 500: '#3b6fe0', 600: '#2a5bd0', 700: '#2349a8', 800: '#1f3d86', 900: '#1d356b', 950: '#14213f' };
const ACCENT_DARK = { 50: '#121c33', 100: '#17264a', 200: '#1f3567', 300: '#2c4a8c', 400: '#5b86e6', 500: '#6b95f0', 600: '#86a8f5', 700: '#a5c0f8', 800: '#c7d7fb', 900: '#e1e9fd', 950: '#f1f5fe' };

const PALETTES = { zinc: colors.zinc, red: colors.red, amber: colors.amber, emerald: colors.emerald };

const rgb = (hex) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};
const ref = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

function themeVars(dark) {
  const v = {};
  for (const [name, pal] of Object.entries(PALETTES)) {
    const map = name === 'zinc' ? NEUTRAL_DARK : TINT_DARK;
    for (const s of STEPS) v[`--c-${name}-${s}`] = rgb(pal[dark ? map[s] : s]);
  }
  for (const s of STEPS) v[`--c-accent-${s}`] = rgb((dark ? ACCENT_DARK : ACCENT_LIGHT)[s]);
  // surfaces: in dark mode cards sit slightly above the page (zinc-50 -> zinc-950)
  v['--c-white'] = dark ? '19 19 22' : '255 255 255';
  return v;
}

const scale = (name) => Object.fromEntries(STEPS.map((s) => [s, ref(`${name}-${s}`)]));

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', ...defaultTheme.fontFamily.sans],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: { '2xs': ['0.6875rem', { lineHeight: '1rem' }] },
      colors: {
        white: ref('white'),
        zinc: scale('zinc'),
        red: scale('red'),
        amber: scale('amber'),
        emerald: scale('emerald'),
        accent: scale('accent'),
        ink: { DEFAULT: '#09090b', fg: '#d4d4d8', muted: '#a1a1aa' },
      },
      ringOffsetColor: { DEFAULT: ref('white') },
    },
  },
  plugins: [
    plugin(({ addBase }) => {
      addBase({ ':root': { ...themeVars(false), colorScheme: 'light' }, ':root.dark': { ...themeVars(true), colorScheme: 'dark' } });
    }),
  ],
};
