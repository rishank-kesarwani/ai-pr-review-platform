/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    domains: ['avatars.githubusercontent.com', 'github.com'],
  },
};

module.exports = nextConfig;
