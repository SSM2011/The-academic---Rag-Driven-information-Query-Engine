/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-body)', 'Georgia', 'serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        ink: {
          50: '#f5f4f0',
          100: '#e8e6df',
          200: '#d0cdc2',
          300: '#b2ad9e',
          400: '#908977',
          500: '#756d5a',
          600: '#5e5748',
          700: '#4a4438',
          800: '#3a352b',
          900: '#2a261e',
          950: '#1a1812',
        },
        parchment: {
          50: '#fdfcf8',
          100: '#f8f5ec',
          200: '#f0eada',
          300: '#e5d8c0',
          400: '#d4be99',
          500: '#bfa276',
        },
        accent: {
          DEFAULT: '#8B1A1A',
          light: '#c44',
          dark: '#5a1010',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'typing': 'typing 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        typing: {
          '0%, 100%': { opacity: 0.2 },
          '50%': { opacity: 1 },
        }
      }
    },
  },
  plugins: [],
};
