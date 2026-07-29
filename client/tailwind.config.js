/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Portfolio SaaS theme
        brand: '#0566C8',
        'brand-hover': '#044FA0',
        'brand-soft': '#EFF6FF',
        fog: '#F3F5F8',
        ink: '#0F172A',
        ash: '#64748B',
        wire: '#E2E8F0',
        // LeadGeneratorApp internal dark theme
        coal: '#0D0C0A',
        ember: '#191510',
        'ember-up': '#231E16',
        copper: '#C07830',
        chalk: '#EAE4D6',
        dust: '#6B6057',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.10), 0 2px 4px -1px rgb(0 0 0 / 0.06)',
      },
    },
  },
  plugins: [],
};
