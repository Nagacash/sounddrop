import os from "os";
import path from "path";
import type { NextConfig } from "next";

const webpackCacheDirectory = path.join(os.tmpdir(), "sounddrop-webpack-cache");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
  // Keep build output in ./.next (must stay in-project for module resolution).
  // Put webpack's filesystem cache on local disk to avoid /Volumes AppleDouble corruption.
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = {
        type: "filesystem",
        cacheDirectory: webpackCacheDirectory,
      };
    }
    return config;
  },
};

export default nextConfig;
