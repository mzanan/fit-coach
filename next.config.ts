import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["heic-decode"],
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
