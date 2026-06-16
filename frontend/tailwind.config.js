/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Identidad de marca Dental Namay
        namay: {
          navy:  '#1D3557',
          steel: '#457B9D',
          coral: '#E63946',
          cream: '#F1F4F9',
          ice:   '#FFFFFF',
        },
        // Estados semánticos
        success: {
          50:  '#F0FDF4',
          100: '#DCFCE7',
          500: '#16A34A',
          600: '#15803D',
          700: '#166534',
        },
        warning: {
          50:  '#FFFBEB',
          100: '#FEF9C3',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
        },
        danger: {
          50:  '#FEF2F2',
          100: '#FEE2E2',
          500: '#DC2626',
          600: '#B91C1C',
          700: '#991B1B',
        },
        info: {
          50:  '#EFF6FF',
          100: '#DBEAFE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        // Mantener primary/secondary por compatibilidad
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        secondary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
      },
      boxShadow: {
        'card':    '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)',
        'card-md': '0 4px 6px -1px rgb(29 53 87 / 0.06), 0 2px 4px -2px rgb(29 53 87 / 0.04)',
        'card-lg': '0 10px 15px -3px rgb(29 53 87 / 0.08), 0 4px 6px -4px rgb(29 53 87 / 0.05)',
        'modal':   '0 25px 50px -12px rgb(29 53 87 / 0.25)',
        'coral':   '0 6px 16px -2px rgb(230 57 70 / 0.35)',
      },
      borderRadius: {
        'card':   '0.75rem',
        'btn':    '0.5rem',
        'hair':   '0.375rem',
      },
      letterSpacing: {
        'wide-xs': '0.15em',
        'wide-sm': '0.2em',
        'wide-md': '0.25em',
        'wide-lg': '0.3em',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in':  'fade-in 200ms ease-out',
        'scale-in': 'scale-in 200ms ease-out',
      },
    },
  },
  plugins: [],
}
