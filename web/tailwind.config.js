/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#8B7355',
        secondary: '#A8DADC',
        accent: '#E9C46A',
        needs: '#457B9D',
        insights: '#F4A261',
        reflection: '#2A9D8F',
        strengths: '#E76F51',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Source Han Serif', 'serif'],
      },
    },
  },
  plugins: [],
}
