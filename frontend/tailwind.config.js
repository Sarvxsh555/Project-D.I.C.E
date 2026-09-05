/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        odoo: {
          DEFAULT: '#714B67',
          50: '#F7F2F6',
          100: '#EEE3EB',
          200: '#DAC3D4',
          300: '#C29FB8',
          400: '#A5789A',
          500: '#875A7B',
          600: '#714B67',
          700: '#5B3C53',
          800: '#452D3F',
          900: '#2F1E2B',
        },
        odooink: '#2F3040',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        script: ['Caveat', 'cursive'],
      },
      borderRadius: {
        pill: '999px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(47,32,43,0.06), 0 4px 16px rgba(47,32,43,0.06)',
        popover: '0 8px 30px rgba(47,32,43,0.12)',
      },
    },
  },
  plugins: [],
};
