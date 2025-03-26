import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // This will disable ESLint checking during production builds
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;