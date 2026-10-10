import type { NextConfig } from "next";
import path from "node:path";

const ortBundlePath = path.resolve(
  process.cwd(),
  "vendor/ort.bundle.min.mjs",
);

const nextConfig: NextConfig = {
  output: "export",
  reactCompiler: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
      config.resolve.alias = {
        ...config.resolve.alias,
        "ort.bundle.min.mjs": ortBundlePath,
      };
    }

    return config;
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
