/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 磁带未来主义配色方案
        cream: {
          50: '#FDF8F3',
          100: '#FAF0E6',
          200: '#F5E6D3',
          300: '#EDD9BE',
          400: '#E2C6A3',
          500: '#D4B589',
          600: '#C4A575',
          700: '#A88A5F',
          800: '#8B7351',
          900: '#6E5C3F',
        },
        mustard: {
          50: '#FEF9E7',
          100: '#FEF0C2',
          200: '#FDE597',
          300: '#FBD966',
          400: '#F9C934',
          500: '#F5B917',
          600: '#EAA612',
          700: '#D8900C',
          800: '#B7770A',
          900: '#946109',
        },
        burnt: {
          50: '#FFF0EB',
          100: '#FFE0D5',
          200: '#FFC8B5',
          300: '#FFA890',
          400: '#FF8569',
          500: '#FF6B4F',
          600: '#F54D35',
          700: '#D03B26',
          800: '#B02F22',
          900: '#90261F',
        },
        warm: {
          50: '#F9F9F7',
          100: '#F0F0EB',
          200: '#E4E4DB',
          300: '#D4D4C5',
          400: '#C0C0AA',
          500: '#A8A894',
          600: '#92927E',
          700: '#7A7A68',
          800: '#626255',
          900: '#4F4F47',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Courier Prime', 'Courier New', 'monospace'],
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        // 硬边阴影（无模糊，80年代风格）
        'hard': '3px 3px 0px 0px rgba(110, 92, 63, 0.4)',
        'hard-sm': '2px 2px 0px 0px rgba(110, 92, 63, 0.3)',
        'hard-lg': '5px 5px 0px 0px rgba(110, 92, 63, 0.5)',
        'hard-colored': '3px 3px 0px 0px #F5B917',
      },
      backgroundImage: {
        // 半调网点图案
        'halftone': 'radial-gradient(circle, rgba(110, 92, 63, 0.1) 1px, transparent 1px)',
        // 网格线
        'grid': 'linear-gradient(to right, rgba(110, 92, 63, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(110, 92, 63, 0.05) 1px, transparent 1px)',
        // 扫描线
        'scanlines': 'repeating-linear-gradient(to bottom, transparent, transparent 2px, rgba(110, 92, 63, 0.03) 2px, rgba(110, 92, 63, 0.03) 4px)',
      },
      backgroundSize: {
        'halftone': '8px 8px',
        'grid': '20px 20px',
      },
    },
  },
  plugins: [],
}
