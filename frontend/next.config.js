/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Enable modern image formats for maximum compression efficiency
    formats: ['image/avif', 'image/webp'],
    // Restrict deviceSizes to 3 key breakpoints matching responsive layouts (Mobile, Tablet, Desktop)
    // Avoids default 8-breakpoint variant explosion (640, 750, 828, 1080, 1200, 1920, 2048, 3840)
    deviceSizes: [640, 1080, 1920],
    // Restrict imageSizes to essential thumbnail dimensions
    // Avoids default 8-size variant explosion (16, 32, 48, 64, 96, 128, 256, 384)
    imageSizes: [32, 64, 128, 256],
    // Set 1-year cache TTL so transformed images remain cached on Vercel Edge CDN without re-triggering transformations
    minimumCacheTTL: 31536000,
    // Disallow SVG transformation through the optimizer; SVGs should always be served vector-native
    dangerouslyAllowSVG: false,
    // Modern remotePatterns replacing deprecated domains key
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'github.com',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        // Cache static images in /public across browser and CDN edges
        source: '/:path*\\.(svg|ico|png|jpg|jpeg|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
