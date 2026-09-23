import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["@garment-erp/shared", "@garment-erp/validation"],
};

export default nextConfig;
