/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bridge: {
          50: '#f4f7f1',
          100: '#e5edde',
          200: '#c9d8bb',
          300: '#a1bc8f',
          400: '#779a60',
          500: '#5c7e46',
          600: '#476337',
          700: '#374d2c',
          800: '#2c3d25',
          900: '#24311f'
        },
        clay: '#f18f65',
        gold: '#f4be37',
        ink: '#22313f'
      },
      boxShadow: {
        panel: '0 18px 60px rgba(34, 49, 63, 0.12)'
      },
      backgroundImage: {
        'hero-radial':
          'radial-gradient(circle at top left, rgba(241,143,101,0.28), transparent 32%), radial-gradient(circle at bottom right, rgba(92,126,70,0.24), transparent 26%)'
      }
    }
  },
  plugins: []
};
