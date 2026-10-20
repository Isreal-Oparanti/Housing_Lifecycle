import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @truecost/core ships TypeScript source; let Next compile it.
  transpilePackages: ["@truecost/core"],
};

export default nextConfig;
