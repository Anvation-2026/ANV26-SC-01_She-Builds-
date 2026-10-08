/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hazard: {
          orange: "#f97316",
          red: "#ef4444",
          safe: "#10b981",
          cyan: "#06b6d4"
        }
      }
    },
  },
  plugins: [],
}
