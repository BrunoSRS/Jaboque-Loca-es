/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        jaboque: {
          navy: '#012169',
          'navy-top': '#002b5c',
          'navy-dark': '#001a3d',
          'navy-deep': '#001428',
          'navy-light': '#003399',
          orange: '#F58220',
          'orange-dark': '#d96f12',
          'orange-light': '#ff9a3d',
          white: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        brand: '0 4px 14px rgba(1, 33, 105, 0.15)',
      },
    },
  },
  plugins: [],
};
