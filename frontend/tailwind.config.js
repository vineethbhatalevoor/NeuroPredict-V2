/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          main: '#0B0F19',
          card: '#141B2D',
          sidebar: '#0E1425',
          input: '#1D263B',
          hover: '#222C44'
        },
        primary: {
          DEFAULT: '#7F77DD',
          glow: 'rgba(127, 119, 221, 0.25)',
          dark: '#534AB7'
        },
        accent: {
          teal: '#1D9E75',
          blue: '#378ADD',
          coral: '#D85A30',
          amber: '#BA7517',
          red: '#E24B4A'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow-purple': '0 0 20px rgba(127, 119, 221, 0.25)',
        'glow-teal': '0 0 20px rgba(29, 158, 117, 0.15)',
        'glow-red': '0 0 20px rgba(226, 75, 74, 0.15)'
      }
    },
  },
  plugins: [],
}
