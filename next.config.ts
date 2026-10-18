import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["192.168.68.140"],
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};
export default nextConfig;
