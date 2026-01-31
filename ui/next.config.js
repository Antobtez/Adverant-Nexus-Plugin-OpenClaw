/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output mode - set to 'standalone' for production Docker build
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,

  // Base path for serving the UI at /openclaw/ui
  basePath: '/openclaw/ui',

  // Asset prefix for CDN (if needed)
  // assetPrefix: process.env.CDN_URL || '',

  // Strict mode for development
  reactStrictMode: true,

  // SWC minification
  swcMinify: true,

  // Image optimization
  images: {
    domains: ['cdn.adverant.ai', 'api.adverant.ai'],
    unoptimized: process.env.NODE_ENV === 'development',
  },

  // Environment variables exposed to browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.adverant.ai',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'wss://api.adverant.ai/openclaw/ws',
  },

  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Add custom webpack config here if needed
    return config;
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/',
        destination: '/openclaw/ui',
        basePath: false,
        permanent: false,
      },
    ];
  },

  // Headers for security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // TypeScript config
  typescript: {
    // Dangerously allow production builds to complete even with type errors
    // Set to false in production for safety
    ignoreBuildErrors: false,
  },

  // ESLint config
  eslint: {
    // Don't run ESLint during production builds (run separately in CI)
    ignoreDuringBuilds: false,
  },

  // Experimental features
  experimental: {
    // Enable Server Actions
    serverActions: true,
  },
};

module.exports = nextConfig;
