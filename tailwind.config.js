/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a1733', // azul-marinho profundo
        card: '#112147', // azul dos cards
        border: '#b68f37', // bordas/detalhes em dourado (logo)
        accent: '#e9b949', // dourado (acento principal)
        brand: '#3583ff', // azul vivo (destaques/ações)
        ink: '#eef3fc', // branco
        t1: '#3583ff',
        t2: '#e9b949',
        t3: '#5aa0ff',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
      },
      keyframes: {
        pulseGreen: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(233,185,73,0.6)' },
          '50%': { boxShadow: '0 0 0 6px rgba(233,185,73,0)' },
        },
        typing: {
          '0%': { opacity: '0.2' },
          '20%': { opacity: '1' },
          '100%': { opacity: '0.2' },
        },
      },
      animation: {
        pulseGreen: 'pulseGreen 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
