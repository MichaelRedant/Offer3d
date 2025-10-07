export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#f8c46a',          // warme amber accentkleur met hoger contrast
        accent: '#78b4b2',           // koel contrast voor links/acties
        background: '#131210',       // diep charcoal basis
        base: {
          DEFAULT: '#131210',
          soft: '#1b1a17',
          highlight: '#23221c',
        },
        parchment: {
          DEFAULT: '#e4d6b4',
          light: '#f1e7cb',
          deep: '#c6b389',
        },
        ink: {
          DEFAULT: '#fdf4db',
          muted: '#dacdb3',
          faint: '#a99c85',
        },
        gridline: '#2d281f',
        signal: {
          green: '#94d477',
          red: '#d9705f',
          blue: '#72a9d1',
          amber: '#f4c870',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Mono"', '"Fira Code"', '"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        mono: ['"IBM Plex Mono"', '"Fira Code"', '"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        terminal: '0 18px 38px rgba(8, 8, 8, 0.6)',
        'terminal-inset': 'inset 0 1px 0 rgba(255, 255, 255, 0.08), inset 0 -2px 0 rgba(0, 0, 0, 0.55)',
        'terminal-glow': '0 0 20px rgba(244, 184, 96, 0.2)',
      },
      backgroundImage: {
        'terminal-grid': 'linear-gradient(transparent 95%, rgba(0, 0, 0, 0.25) 100%), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 0, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
        'terminal-noise': 'radial-gradient(circle at 50% 50%, rgba(244, 232, 204, 0.08), rgba(0, 0, 0, 0.65) 80%)',
      },
      letterSpacing: {
        dial: '0.075em',
        wide: '0.16em',
      },
      borderRadius: {
        card: '18px',
        pill: '999px',
      },
    },
  },
  plugins: [],
};
