import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        espresso: {
          950: '#0c0a09',
          900: '#1c1614',
          800: '#2b211d',
          700: '#3e2f28',
          500: '#6f4e37',
          300: '#b38b6d',
          100: '#eadfd7',
        },
      },
    },
  },
  plugins: [],
}
export default config
