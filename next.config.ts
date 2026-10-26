import type { NextConfig } from "next";
import path from "node:path";

const workerOnlyOrtShimPath = path.resolve(
  process.cwd(),
  "vendor/onnxruntime-worker-only.mjs",
);
const workerOnlyOpenCvShimPath = path.resolve(
  process.cwd(),
  "vendor/opencv-worker-only.mjs",
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
        "@techstark/opencv-js$": workerOnlyOpenCvShimPath,
        "onnxruntime-web$": workerOnlyOrtShimPath,
      };
    }

    return config;
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
