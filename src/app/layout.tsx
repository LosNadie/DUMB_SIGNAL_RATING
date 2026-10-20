import type { Metadata, Viewport } from 'next'

import { cinzel, inter, playfair } from './fonts'
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from '@/lib/seo/metadata'
import { siteUrl } from '@/lib/env'

import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  keywords: ['乐评', '专辑', '动漫', '电影', '评分', 'DUMB SIGNAL'],
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'zh_CN',
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    url: siteUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#000000',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className={`${playfair.variable} ${inter.variable} ${cinzel.variable}`}>
      <body className="bg-signal-bg text-signal-fg antialiased">{children}</body>
    </html>
  )
}
