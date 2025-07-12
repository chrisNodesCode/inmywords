/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Prevent ESLint errors from failing `next build`
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;