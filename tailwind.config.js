export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1A73E8',          // Futuristic Blue – vertrouwen en innovatie
        accent: '#2EE8B7',           // Aqua Green – fris en modern
        background: '#F9FAFB',       // lichte, cleane basis
        base: {
          DEFAULT: '#F9FAFB',
          soft: '#F3F4F6',
          highlight: '#E5E7EB',
        },
        parchment: {
          DEFAULT: '#ffffff',
          light: '#ffffff',
          deep: '#eef2f8',
        },
        ink: {
          DEFAULT: '#111827',        // bijna zwart voor hoog contrast
          muted: '#1f2937',
          faint: '#4B5563',
        },
        gridline: '#E5E7EB',
        signal: {
          green: '#16c79a',
          red: '#ef4444',
          blue: '#3b82f6',
          amber: '#f59e0b',
        },
      },
      fontFamily: {
        sans: ['"Inter"', '"Poppins"', '"Source Sans Pro"', 'system-ui', 'ui-sans-serif', 'Arial', 'sans-serif'],
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
