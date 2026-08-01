/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf2f8',
          100: '#fce7f3',
          400: '#e879f9',
          500: '#c026d3',
          600: '#a21caf',
          700: '#86198f',
          900: '#4a044e',
        },
      },
    },
  },
  plugins: [],
};
