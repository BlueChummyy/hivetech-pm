import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        '3xl': '1920px',
        '4xl': '2560px',
      },
      colors: {
        primary: {
          50: 'var(--primary-50, #f0fdf4)',
          100: 'var(--primary-100, #dcfce7)',
          200: 'var(--primary-200, #bbf7d0)',
          300: 'var(--primary-300, #86efac)',
          400: 'var(--primary-400, #4ade80)',
          500: 'var(--primary-500, #22c55e)',
          600: 'var(--primary-600, #16a34a)',
          700: 'var(--primary-700, #15803d)',
          800: 'var(--primary-800, #166534)',
          900: 'var(--primary-900, #14532d)',
          950: 'var(--primary-950, #052e16)',
        },
        surface: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
        accent: {
          teal: '#14b8a6',
          amber: '#f59e0b',
          rose: '#f43f5e',
          emerald: '#10b981',
          sky: '#0ea5e9',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
