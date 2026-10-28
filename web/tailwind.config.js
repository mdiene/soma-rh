/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#1D2A33', soft: '#3A4A55', muted: '#6B7A84' },
        paper: '#F6F7F5',
        line: '#DCE1DE',
        river: { DEFAULT: '#0F6E6A', dark: '#0A5552', light: '#E3F0EF' },
        phosphate: { DEFAULT: '#E0B000', light: '#FBF3D6' },
        signal: { DEFAULT: '#B3261E', light: '#FBE9E7' },
      },
      fontFamily: {
        sans: ['Archivo', 'system-ui', 'sans-serif'],
      },
      borderRadius: { DEFAULT: '6px' },
    },
  },
  plugins: [],
}
