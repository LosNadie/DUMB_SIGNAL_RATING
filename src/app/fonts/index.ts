import localFont from 'next/font/local'

/**
 * Fonts are self-hosted so the production image never depends on Google
 * Fonts at build time or runtime (the site targets mainland China users).
 * Only the latin subset is bundled; Chinese text falls back to the system
 * stack declared in globals.css.
 */

export const playfair = localFont({
  src: './playfair-display-latin.woff2',
  variable: '--font-display',
  display: 'swap',
  weight: '400 700',
  fallback: ['Georgia', 'serif'],
})

export const inter = localFont({
  src: './inter-latin.woff2',
  variable: '--font-sans',
  display: 'swap',
  weight: '300 600',
  fallback: ['system-ui', 'sans-serif'],
})

export const cinzel = localFont({
  src: './cinzel-latin.woff2',
  variable: '--font-logo',
  display: 'swap',
  weight: '400 600',
  fallback: ['Georgia', 'serif'],
})
