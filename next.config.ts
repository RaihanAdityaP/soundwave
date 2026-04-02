import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    // Deezer CDN resolves to private IPs in some environments — bypass Next.js optimizer for it
    unoptimized: process.env.NODE_ENV === 'development',
    remotePatterns: [
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'img.youtube.com' },
      { protocol: 'https', hostname: 'e-cdns-images.dzcdn.net' },
      { protocol: 'https', hostname: 'cdn-images.dzcdn.net' },
    ],
  },
}

export default nextConfig