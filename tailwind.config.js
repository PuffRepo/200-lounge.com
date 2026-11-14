/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,cjs,ts}",
  ],
  theme: {},
  plugins: [
    require('@tailwindcss/typography'),
    // ...
  ],
}
