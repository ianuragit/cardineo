/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Do not fail production builds on lint errors (Railway deploys).
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
