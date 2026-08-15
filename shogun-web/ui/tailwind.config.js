/** @type {import('tailwindcss').Config} */
export default {
  // "blue" and "dark" themes are both dark surfaces, so the dark: variant
  // activates for either of them. "light" is the only light theme.
  // Tailwind v3: the second array element is a single selector string.
  // Use :is() to match either data-theme value.
  darkMode: ['selector', ':is([data-theme="blue"], [data-theme="dark"])'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sidebar: {
          DEFAULT: '#0f1117',
          hover: '#1a1d27',
          border: '#1e2230',
          muted: '#8b92a8',
          text: '#e8eaf0',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f6f7f9',
          border: '#e5e7eb',
        },
        brand: {
          DEFAULT: '#5b5bd6',
          dark: '#4a4ac0',
          light: '#eef0ff',
        },
        dept: {
          hr: '#ec4899',
          finance: '#10b981',
          crm: '#3b82f6',
          marketing: '#f59e0b',
          compliance: '#8b5cf6',
          support: '#06b6d4',
          engineering: '#6366f1',
          projects: '#f97316',
          product: '#14b8a6',
          procurement: '#ef4444',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 17, 23, 0.04), 0 4px 16px rgba(15, 17, 23, 0.04)',
      },
    },
  },
  plugins: [],
};
