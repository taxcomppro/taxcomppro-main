import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Content-Security-Policy", value: "object-src 'none'; base-uri 'self'; frame-ancestors 'self'" },
      ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : []),
    ] }];
  },
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    proxyClientMaxBodySize: "50mb",
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async redirects() {
    return [
      { source: "/communities/:path*", destination: "/groups/:path*", permanent: true },
      {
        source: "/affiliate",
        destination: "https://affiliate.taxcomppro.com",
        permanent: false,
      },
      {
        source: "/affiliate/:path*",
        destination: "https://affiliate.taxcomppro.com/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
