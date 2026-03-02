import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a1a',
        surface: '#141432',
        card: '#1c1c3c',
        primary: {
          DEFAULT: '#7c6ff7',
          light: '#9d93fa',
        },
        accent: '#ffd43b',
        yes: '#51cf66',
        no: '#ff6b6b',
        irrelevant: '#868e96',
        text: {
          DEFAULT: '#e9ecef',
          muted: '#adb5bd',
        },
        border: '#2a2a4a',
      },
      fontFamily: {
        heading: ['Outfit', 'system-ui', 'sans-serif'],
        body: ['Work Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
