import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],

  // Dark mode is driven by data-mode="dark" on <html>,
  // not the 'class' strategy. We handle this via CSS
  // attribute selectors in globals.css rather than Tailwind's
  // built-in dark: variant, so set darkMode to 'class' and
  // apply the 'dark' class via our theme provider.
  darkMode: 'class',

  theme: {
    extend: {
      // ── Font Families ──────────────────────────────────────────
      // Body font is dynamic (user preference) — applied via
      // CSS variable --imw-font-body on the html element.
      // Use font-body in Tailwind to get the current preference.
      fontFamily: {
        body:  ['var(--imw-font-body)', 'Georgia', 'serif'],
        sans:  ['var(--font-sans)',     'system-ui', 'sans-serif'],
        noto:  ['"Noto Serif"',         'Georgia', 'serif'],
        pt:    ['"PT Serif"',           'Georgia', 'serif'],
        open:  ['"Open Sans"',          'Arial', 'sans-serif'],
        deju:  ['"DejaVu Sans"',        'Arial', 'sans-serif'],
      },

      // ── Colors — semantic aliases to CSS tokens ─────────────────
      // All values reference CSS custom properties so they respond
      // automatically to mode (light/dark) and accent changes.
      colors: {
        // Backgrounds
        'imw-base':    'var(--imw-bg-base)',
        'imw-surface': 'var(--imw-bg-surface)',
        'imw-raised':  'var(--imw-bg-raised)',
        'imw-input':   'var(--imw-bg-input)',
        'imw-sidebar': 'var(--imw-bg-sidebar)',

        // Text
        'imw-text':       'var(--imw-text-primary)',
        'imw-text-2':     'var(--imw-text-secondary)',
        'imw-text-3':     'var(--imw-text-tertiary)',
        'imw-text-entry': 'var(--imw-text-entry)',

        // Accent system
        'imw-ac':   'var(--imw-ac)',
        'imw-ac-l': 'var(--imw-ac-l)',
        'imw-ac-b': 'var(--imw-ac-b)',
        'imw-ac-d': 'var(--imw-ac-d)',
        'imw-ac-dp':'var(--imw-ac-dp)',

        // Semantic states
        'imw-error':         'var(--imw-error-text)',
        'imw-error-border':  'var(--imw-error-border)',
        'imw-error-bg':      'var(--imw-error-bg)',
        'imw-success':       'var(--imw-success-color)',

        // Category annotation colors (light)
        'cat-exec':  'var(--cat-exec-l-color)',
        'cat-sens':  'var(--cat-sens-l-color)',
        'cat-mask':  'var(--cat-mask-l-color)',
        'cat-work':  'var(--cat-work-l-color)',
        'cat-emot':  'var(--cat-emot-l-color)',
        'cat-func':  'var(--cat-func-l-color)',
        'cat-soc':   'var(--cat-soc-l-color)',
        'cat-med':   'var(--cat-med-l-color)',
      },

      // ── Border Colors ───────────────────────────────────────────
      borderColor: {
        'imw-default': 'var(--imw-border-default)',
        'imw-medium':  'var(--imw-border-medium)',
        'imw-strong':  'var(--imw-border-strong)',
        'imw-ac':      'var(--imw-ac)',
        'imw-ac-b':    'var(--imw-ac-b)',
      },

      // ── Typography Scale ─────────────────────────────────────────
      fontSize: {
        'imw-display': ['30px', { lineHeight: '1.2',  fontWeight: '400' }],
        'imw-h1':      ['22px', { lineHeight: '1.3',  fontWeight: '400' }],
        'imw-h2':      ['18px', { lineHeight: '1.4',  fontWeight: '400' }],
        'imw-h3':      ['16px', { lineHeight: '1.5',  fontWeight: '400' }],
        'imw-body':    ['16px', { lineHeight: '1.8',  fontWeight: '400' }],
        'imw-ui':      ['14px', { lineHeight: '1.5',  fontWeight: '400' }],
        'imw-small':   ['13px', { lineHeight: '1.5',  fontWeight: '400' }],
        'imw-caption': ['12px', { lineHeight: '1.5',  fontWeight: '400' }],
        'imw-label':   ['11px', { lineHeight: '1.4',  fontWeight: '500' }],
      },

      // ── Border Radius ────────────────────────────────────────────
      borderRadius: {
        'imw-sm':   '3px',
        'imw-md':   '8px',
        'imw-lg':   '12px',
        'imw-pill': '20px',
      },

      // ── Spacing additions ────────────────────────────────────────
      maxWidth: {
        'imw-narrow': '480px',
        'imw-mid':    '640px',
        'imw-wide':   '820px',
      },

      // ── Box shadows ──────────────────────────────────────────────
      boxShadow: {
        'imw-focus': '0 0 0 3px var(--imw-ac-l)',
        'imw-focus-error': '0 0 0 3px var(--imw-error-bg)',
      },

      // ── Animation ───────────────────────────────────────────────
      keyframes: {
        'imw-blink': {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0' },
        },
        'imw-drawer-in': {
          from: { transform: 'translateX(100%)' },
          to:   { transform: 'translateX(0)' },
        },
        'imw-fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
      },
      animation: {
        'imw-blink':     'imw-blink 1.1s step-end infinite',
        'imw-drawer-in': 'imw-drawer-in 0.25s ease',
        'imw-fade-in':   'imw-fade-in 0.2s ease',
      },
    },
  },

  plugins: [],
}

export default config
