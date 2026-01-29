const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

if (process.env.NEXTAUTH_URL_MAHALILAH) {
  process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL_MAHALILAH;
}

if (!process.env.NEXT_PUBLIC_MAHALILAH_URL && process.env.NEXTAUTH_URL) {
  process.env.NEXT_PUBLIC_MAHALILAH_URL = process.env.NEXTAUTH_URL;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ["@hekate/database", "@hekate/mahalilah-core"],
  output: 'standalone',
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

module.exports = nextConfig;
