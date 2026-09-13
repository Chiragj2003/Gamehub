import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the module root to this project. Without it, a checkout nested inside
  // another copy of the repo (a git worktree) can silently resolve packages
  // from the parent's node_modules and pass a build that fails on Vercel.
  turbopack: {
    root: path.resolve(__dirname),
  },

  // Baseline hardening. frame-ancestors keeps the site (and its games) from
  // being embedded on other origins; the rest close common browser footguns.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
