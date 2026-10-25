/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 品牌色：墨绿 + 象牙白（Apple 式克制 + Notion 式编辑感）
        ink: {
          50: '#f2f7f6',
          100: '#e0ece9',
          200: '#c2d9d4',
          300: '#9cbfb8',
          400: '#6f9d95',
          500: '#4d8178',
          600: '#3a6861',
          700: '#2f5350',
          800: '#284442',
          900: '#1f3534',
          950: '#12201f'
        },
        paper: '#fbfaf7',
        accent: {
          amber: '#c9a227',
          coral: '#d9695c'
        }
      },
      fontFamily: {
        display: ['Georgia', 'Songti SC', 'STSong', 'serif'],
        sans: ['Inter', 'PingFang SC', 'Hiragino Sans GB', 'system-ui', 'sans-serif'],
        mono: ['SF Mono', 'JetBrains Mono', 'Menlo', 'monospace']
      },
      boxShadow: {
        card: '0 1px 2px rgba(18,32,31,.04), 0 8px 24px rgba(18,32,31,.06)',
        float: '0 2px 6px rgba(18,32,31,.08), 0 16px 40px rgba(18,32,31,.12)'
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem'
      }
    }
  },
  plugins: []
}
