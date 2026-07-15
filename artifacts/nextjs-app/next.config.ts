import type { NextConfig } from "next";
import path from "node:path";

/** Monorepo root — keeps Vercel/file tracing from picking a parent lockfile. */
const workspaceRoot = path.join(__dirname, "../..");

const nextConfig: NextConfig = {
  outputFileTracingRoot: workspaceRoot,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
