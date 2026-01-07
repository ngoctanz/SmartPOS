import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  // Proxy API requests to backend - giải quyết cross-origin cookie
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "http://localhost:8081/api/v1/:path*",
      },
      {
        source: "/api/v2/:path*",
        destination: "http://localhost:8081/api/v2/:path*",
      },
    ];
  },
};

export default nextConfig;
