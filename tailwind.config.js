/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        secondary: '#1f2937',
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
      }
    },
  },
  plugins: [],
}