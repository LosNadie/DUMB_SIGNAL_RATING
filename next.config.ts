import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // output: standalone (local verification)
  poweredByHeader: false,
  reactStrictMode: true,

  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: 'https', hostname: 'image.tmdb.org' },
      { protocol: 'https', hostname: 'lastfm.freetls.fastly.net' },
      { protocol: 'https', hostname: '**.anilist.co' },
      { protocol: 'https', hostname: 'cdn.myanimelist.net' },
      { protocol: 'https', hostname: 'i.scdn.co' },
      { protocol: 'https', hostname: 'e.snmc.io' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
      { protocol: 'https', hostname: 'm.media-amazon.com' },
      { protocol: 'https', hostname: '**.douyinpic.com' },
      { protocol: 'https', hostname: '**.zhimg.com' },
      { protocol: 'https', hostname: '**.sinaimg.cn' },
      { protocol: 'https', hostname: '**.sohucs.com' },
      { protocol: 'https', hostname: '**.gtimg.com' },
      { protocol: 'https', hostname: '**.pinimg.com' },
      { protocol: 'https', hostname: '**.twimg.com' },
      { protocol: 'https', hostname: '**.moegirl.org.cn' },
      { protocol: 'https', hostname: '**.cyol.com' },
      { protocol: 'https', hostname: '**.steamusercontent.com' },
    ],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
    ]
  },
}

export default nextConfig
