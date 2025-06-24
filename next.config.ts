import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Basic configuration for Vercel deployment
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
