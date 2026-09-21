/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        boa: {
          blue: '#002E6D',
          light: '#E6EFF8',
          accent: '#0072CE'
        }
      }
    },
  },
  plugins: [],
}
