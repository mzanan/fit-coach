import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["heic-decode"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  experimental: {
    staleTimes: {
      dynamic: 60,
    },
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
