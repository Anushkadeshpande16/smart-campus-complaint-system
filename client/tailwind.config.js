/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        brand: {
          50: '#effcf9', 100: '#d3f8f0', 200: '#a8efe1', 300: '#72e0cf', 400: '#3ecab9',
          500: '#1fae9f', 600: '#148c82', 700: '#167069', 800: '#175a56', 900: '#184a47',
        },
        ink: { 800: '#12273b', 900: '#0b1b2b', 950: '#07121e' },
        signal: { 400: '#ff8a4c', 500: '#f26b1d', 600: '#d9560e' },
      },
    },
  },
  plugins: [],
};
