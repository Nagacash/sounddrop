import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        sd: {
          bg: '#0a0a0a',
          surface: '#121212',
          border: '#2a2a2a',
          muted: '#9a9a9a',
          text: '#eaeaea',
          accent: '#e61919',
          status: '#4af626',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        none: '0',
        DEFAULT: '0',
        sm: '0',
        md: '0',
        lg: '0',
        xl: '0',
        '2xl': '0',
        '3xl': '0',
        full: '0',
      },
      transitionDuration: {
        fast: '120ms',
        base: '220ms',
        slow: '400ms',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
        in: 'cubic-bezier(0.7, 0, 0.84, 0)',
      },
      zIndex: {
        header: '40',
        modal: '50',
        toast: '60',
      },
    },
  },
  plugins: [],
};

export default config;
