/** @type {import('next').NextConfig} */
const API_TARGET = process.env.API_TARGET ?? "http://127.0.0.1:4000";

const nextConfig = {
  reactStrictMode: true,
  // Bundling / performance
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
  },
  experimental: {
    optimizePackageImports: ["react", "react-dom", "next"],
  },
  // Preview hosts (*.e2b.app) must be allowed to load dev assets.
  allowedDevOrigins: ["*.e2b.app"],
  // Browser code calls /api/v1/* on the same origin; Next proxies to the API server.
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${API_TARGET}/api/v1/:path*` }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Clickjacking defence for login + admin pages.
          { key: "X-Frame-Options", value: "DENY" },
          // HTTPS enforcement once deployed behind TLS (ignored on plain http).
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          // Containment subset that does not break Next.js inline flight data:
          // no script-src/style-src directives (those need nonces).
          {
            key: "Content-Security-Policy",
            value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; img-src 'self' data: blob:; font-src 'self' data:",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
