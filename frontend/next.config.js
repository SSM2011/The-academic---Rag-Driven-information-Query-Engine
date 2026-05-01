/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',   // 🔥 YE IMPORTANT HAI
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  },
};

module.exports = nextConfig;