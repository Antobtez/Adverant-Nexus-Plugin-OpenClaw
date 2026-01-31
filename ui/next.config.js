/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output mode - use 'export' for static HTML generation (served by Express)
  // This generates files in the 'out' directory for static serving
  output: 'export',

  // Base path for serving the UI at /openclaw/ui
  basePath: '/openclaw/ui',

  // Asset prefix - must match base path for proper static asset loading
  assetPrefix: '/openclaw/ui',

  // Trailing slash for static export (helps with routing)
  trailingSlash: true,

  // Strict mode for development
  reactStrictMode: true,

  // Image optimization - must be unoptimized for static export
  images: {
    domains: ['cdn.adverant.ai', 'api.adverant.ai'],
    unoptimized: true, // Required for static export
  },

  // Environment variables exposed to browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.adverant.ai',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'wss://api.adverant.ai/openclaw/ws',
    NEXT_PUBLIC_BASE_PATH: '/openclaw/ui',
  },

  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Disable canvas for QRCode (causes issues in static build)
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    return config;
  },

  // TypeScript config
  typescript: {
    // Allow production builds even with type errors during development
    // Set to false for strict builds
    ignoreBuildErrors: process.env.SKIP_TYPE_CHECK === 'true',
  },

  // ESLint config
  eslint: {
    // Skip ESLint during production builds (run separately in CI)
    ignoreDuringBuilds: process.env.SKIP_LINT === 'true',
  },
};

module.exports = nextConfig;
