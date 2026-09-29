import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["@garment-erp/shared", "@garment-erp/validation"],
  // The workspace packages ship TypeScript source and (for apps/api's NodeNext
  // resolution) import siblings as "./x.js". Map those to the .ts files.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

export default nextConfig;
