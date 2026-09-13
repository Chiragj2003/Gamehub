import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the module root to this project. Without it, a checkout nested inside
  // another copy of the repo (a git worktree) can silently resolve packages
  // from the parent's node_modules and pass a build that fails on Vercel.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
