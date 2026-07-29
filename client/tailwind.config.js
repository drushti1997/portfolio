/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // HubSpot color scheme
        brand: '#FF4800',
        'brand-hover': '#E03E00',
        'brand-soft': '#FFF3EE',
        fog: '#F8F5EE',
        ink: '#1A1A1A',
        ash: '#5A5A5A',
        wire: '#E0D9CE',
        // LeadGeneratorApp internal dark theme
        coal: '#0D0C0A',
        ember: '#191510',
        'ember-up': '#231E16',
        copper: '#C07830',
        chalk: '#EAE4D6',
        dust: '#6B6057',
      },
      fontFamily: {
        sans: ['Lexend Deca', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.10), 0 2px 4px -1px rgb(0 0 0 / 0.06)',
      },
    },
  },
  plugins: [],
};
