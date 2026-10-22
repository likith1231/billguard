import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // argon2 is a native module: keep it out of the server bundle.
  serverExternalPackages: ["@node-rs/argon2"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
