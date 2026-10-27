/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0f1115',      // Near-black
          charcoal: '#1c1f26',  // Charcoal
          brown: '#3e2723',     // Dark brown
          copper: '#c58361',    // Muted copper
          copperHover: '#d79573',
          white: '#f9f6f0',     // Warm white
          gray: '#8a94a6',      // Utility gray
          border: '#2a2e39',    // Fine borders
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
