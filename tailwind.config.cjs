/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx,html}'
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  // Safelist classes referenced dynamically or in strings to avoid being purged
  safelist: [
    'btn-primary',
    'btn-ghost',
    'bento-card',
    'nav-link',
    'ripple-ring',
    'card-dot',
    'bg-porcelain',
    'bg-surface'
  ],
};
