/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ["@hekate/ui", "@hekate/database", "@hekate/shared"],
  images: {
    domains: [
      'localhost',
      'media.caminhosdehekate.com.br',
      'images.unsplash.com', // Para desenvolvimento
      'trae-api-us.mchost.guru', // Para geração de imagens
    ],
    formats: ['image/avif', 'image/webp'],
    unoptimized: true,
  },
  output: 'standalone',
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/sitemap.xml',
        destination: '/api/sitemap',
      },
      {
        source: '/robots.txt',
        destination: '/api/robots',
      },
      {
        // Garante que uploads enviados em runtime sejam servidos pela API,
        // mesmo quando o diretório público não é servido diretamente.
        source: '/uploads/:path*',
        destination: '/api/media/public/uploads/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
