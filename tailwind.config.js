/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#020617',
        surface: '#0f172a',
        'surface-2': '#1e293b',
        'surface-3': '#334155',
        accent: '#22d3ee',
        'accent-2': '#06b6d4',
        text: '#f8fafc',
        'text-2': '#94a3b8',
        'text-3': '#64748b',
      },
      borderRadius: {
        DEFAULT: '12px',
        sm: '8px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease',
        'slide-in': 'slideIn 0.3s ease',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
