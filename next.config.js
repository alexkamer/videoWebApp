/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    appDir: false
  },
  // Load environment variables from .zshrc
  env: {
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY
  }
}

module.exports = nextConfig