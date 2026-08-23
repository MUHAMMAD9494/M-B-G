import type { Config } from 'tailwindcss';

/**
 * Nexora Smart Edu design tokens.
 * Luxury minimal: white canvas, warm off-white surfaces, near-black text,
 * one blue accent used sparingly, 1px stone borders, no gradients.
 */
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: '#FAFAF8',
        accent: {
          DEFAULT: '#1D4ED8',
          hover: '#1E40AF',
          soft: '#EFF6FF',
        },
        success: {
          DEFAULT: '#15803D',
          soft: '#F0FDF4',
        },
        warning: {
          DEFAULT: '#B45309',
          soft: '#FFFBEB',
        },
        danger: {
          DEFAULT: '#B91C1C',
          soft: '#FEF2F2',
        },
      },
      fontFamily: {
        display: ['Georgia', 'ui-serif', 'serif'],
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      maxWidth: {
        container: '80rem',
      },
    },
  },
  plugins: [],
};

export default config;
