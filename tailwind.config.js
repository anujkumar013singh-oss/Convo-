/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-base': 'var(--color-bg-base)',
        'bg-raised': 'var(--color-bg-raised)',
        'bg-hover': 'var(--color-bg-hover)',
        'bg-active': 'var(--color-bg-active)',
        'accent': 'var(--color-accent)',
        'accent-hover': 'var(--color-accent-hover)',
        'accent-strong': 'var(--color-accent-strong)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-tertiary': 'var(--color-text-tertiary)',
        'border-subtle': 'var(--color-border-subtle)',
        'bubble-out': 'var(--color-bubble-out)',
        'bubble-in': 'var(--color-bubble-in)',
        'online-dot': 'var(--color-online-dot)',
      },
      fontFamily: {
        sans: ['"Elms Sans"', '-apple-system', 'system-ui', '"Segoe UI"', 'sans-serif'],
        heading: ['"Chivo Mono"', 'monospace', 'sans-serif'],
        mono: ['"Chivo Mono"', 'monospace'],
      },
      fontSize: {
        'chat-body': ['15px', { lineHeight: '21px', fontWeight: '500' }],
        'sender-name': ['15px', { lineHeight: '20px', fontWeight: '700' }],
        'timestamp': ['12px', { lineHeight: '16px', fontWeight: '500' }],
        'meta': ['14px', { lineHeight: '20px', fontWeight: '500' }],
      },
      spacing: {
        '0.5': '2px',
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '18': '72px',
      },
      borderRadius: {
        'xs': '8px',
        'sm': '10px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
        'full': '9999px',
      },
      transitionDuration: {
        'instant': '100ms',
        'fast': '150ms',
        'normal': '200ms',
        'slow': '250ms',
        'slower': '300ms',
      },
      animation: {
        'pulse-online': 'pulse-online 2s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
        'typing-dot': 'typing-dot 1.4s ease-in-out infinite',
        'fade-in': 'fade-in 200ms ease-out',
        'slide-up': 'slide-up 200ms ease-out',
        'slide-right': 'slide-right 300ms ease-out',
      },
      keyframes: {
        'pulse-online': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(0.85)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'typing-dot': {
          '0%, 60%, 100%': { transform: 'translateY(0)' },
          '30%': { transform: 'translateY(-4px)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-right': {
          '0%': { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      boxShadow: {
        'glow': '0 0 20px rgba(135, 116, 225, 0.25)',
        'card': '0 8px 32px rgba(0, 0, 0, 0.4)',
        'bubble': '0 1px 3px rgba(0, 0, 0, 0.25)',
      },
      backdropBlur: {
        'card': '20px',
      },
    },
  },
  plugins: [],
};
