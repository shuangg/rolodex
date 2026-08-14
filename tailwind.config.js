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
          amber: {
            DEFAULT: '#ecad0a',
            hover: '#d49b09',
            light: '#fef8e7',
            dark: '#936b06',
          },
          blue: {
            DEFAULT: '#209dd7',
            hover: '#1a82b3',
            light: '#e8f5fb',
            dark: '#135c7e',
          },
          purple: {
            DEFAULT: '#753991',
            hover: '#5e2e74',
            light: '#f4edf7',
            dark: '#452255',
          },
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}
