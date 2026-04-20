/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Colores primarios - tonos de cocina cálidos
        food: {
          50: '#fef7ee',
          100: '#fdedd6',
          200: '#fad7ac',
          300: '#f6ba78',
          400: '#f29442',
          500: '#ed751d',
          600: '#de5d13',
          700: '#b8440f',
          800: '#933815',
          900: '#763014',
        },
        // Colores de frescura (verdes)
        fresh: {
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
        // Colores de alerta (rojo tomate)
        tomato: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        // Colores neutros cálidos (crema)
        cream: {
          50: '#fdfbf7',
          100: '#faf5eb',
          200: '#f5ead4',
          300: '#eedbb3',
          400: '#e6c98d',
          500: '#ddb76a',
          600: '#d4a54d',
          700: '#b0853e',
          800: '#8d6b35',
          900: '#72572c',
        }
      },
      fontFamily: {
        cooking: ['Georgia', 'serif'],
      },
      backgroundImage: {
        'food-pattern': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f29442' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        'leaf-pattern': "url(\"data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 0C17.9 0 0 17.9 0 40s17.9 40 40 40 40-17.9 40-40S62.1 0 40 0zm0 70c-16.5 0-30-13.5-30-30S23.5 10 40 10s30 13.5 30 30-13.5 30-30 30z' fill='%2322c55e' fill-opacity='0.05'/%3E%3Ccircle cx='40' cy='40' r='8' fill='%2322c55e' fill-opacity='0.08'/%3E%3C/svg%3E\")",
      },
      animation: {
        'bounce-food': 'bounceFood 2s ease-in-out infinite',
        'pulse-fresh': 'pulseFresh 3s ease-in-out infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
      },
      keyframes: {
        bounceFood: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        pulseFresh: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
      },
    },
  },
  plugins: [],
}
