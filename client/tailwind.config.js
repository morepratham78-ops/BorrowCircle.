/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        emerald: {
          950: '#022c22',
        },
        olx: {
          navy: '#002f34',
          teal: '#00a49f',
          mint: '#23e5db',
          yellow: '#ffce32',
          bg: '#f2f4f5',
          border: '#ebedf0',
          muted: '#7f9799',
          light: '#f7f8f9'
        }
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #059669 0%, #0d9488 50%, #06b6d4 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #2563eb 0%, #4f46e5 50%, #7c3aed 100%)',
        'gradient-accent': 'linear-gradient(135deg, #f97316 0%, #fb7185 50%, #f43f5e 100%)',
      }
    },
  },
  plugins: [],
}
