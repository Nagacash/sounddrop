import os from "os";
import path from "path";
import type { NextConfig } from "next";

const webpackCacheDirectory = path.join(os.tmpdir(), "sounddrop-webpack-cache");

const nextConfig: NextConfig = {
  // Allow Next 16 default Turbopack builds alongside the webpack() hook used by `next dev --webpack`.
  turbopack: {},
  experimental: {
    // proxy.ts buffers every matched body (default 10MB) and truncates the rest.
    // Track uploads allow 12MB MP3s plus cover/form fields.
    proxyClientMaxBodySize: '16mb',
  },
  serverActions: {
    bodySizeLimit: '16mb',
  },
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
