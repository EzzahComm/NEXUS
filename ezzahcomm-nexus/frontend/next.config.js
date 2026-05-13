const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── OUTPUT ────────────────────────────────────────────────
  output: 'standalone',   // required for Docker; Vercel ignores this safely
  outputFileTracingRoot: path.join(__dirname, '../'),

  // ── API PROXY (local dev — Vercel uses vercel.json rewrites) ──
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },

  // ── SECURITY HEADERS ──────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },

  // ── IMAGES ────────────────────────────────────────────────
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'skwgfymxyjtlxmauyidn.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
};

module.exports = nextConfig;
