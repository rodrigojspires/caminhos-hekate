import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        ink: 'var(--ink)',
        'ink-muted': 'var(--ink-muted)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        border: 'var(--border)',
        gold: 'var(--gold)',
        'gold-soft': 'var(--gold-soft)',
        teal: 'var(--teal)'
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'ui-serif', 'Georgia', 'serif']
      },
      maxWidth: {
        content: '1200px'
      },
      boxShadow: {
        soft: '0 24px 60px rgba(8, 12, 20, 0.55)',
        glow: '0 0 0 1px rgba(217, 164, 65, 0.2), 0 16px 40px rgba(217, 164, 65, 0.18)'
      },
      backgroundImage: {
        mist: 'radial-gradient(1200px 800px at 15% 10%, rgba(217, 164, 65, 0.12) 0%, rgba(13, 17, 26, 0.95) 55%, #0b0e13 100%)',
        halo: 'radial-gradient(700px 460px at 80% 10%, rgba(106, 211, 176, 0.16) 0%, rgba(13, 17, 26, 0.2) 60%, transparent 100%)'
      }
    }
  },
  plugins: []
}

export default config
