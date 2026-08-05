/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Charte graphique officielle du logo (coeur + anneau) : rose #fe466c, prune #5b424d.
        brand: {
          50: '#fff0f3',
          100: '#ffdee5',
          200: '#ffb9c7',
          300: '#fe90a7',
          400: '#fe6786',
          500: '#fe466c',
          600: '#d83c5c',
          700: '#ad3049',
          800: '#7f2336',
          900: '#591826',
        },
        ink: {
          50: '#efeced',
          100: '#dbd5d8',
          200: '#b5aaaf',
          300: '#94848b',
          400: '#745e68',
          500: '#5b424d',
          600: '#4b363f',
          700: '#382930',
          800: '#291e23',
          900: '#1b1417',
        },
      },
    },
  },
  plugins: [],
};
