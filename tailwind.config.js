/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          teal: '#0CBDB5',
          'teal-dark': '#0AA49C',
          'teal-light': '#26D0C8',
          orange: '#FF6200',
          'orange-light': '#FF7A19',
          navy: '#0A3D3A',
          'navy-light': '#0C4E4A',
        },
      },
    },
  },
  plugins: [],
}
