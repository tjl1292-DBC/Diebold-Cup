import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The SQLite file is a build artifact (npm run import) that must ship with
  // the server functions on Vercel.
  outputFileTracingIncludes: {
    "/**": ["./data/diebold.db"],
  },
  serverExternalPackages: ["@libsql/client", "libsql"],
};

export default nextConfig;
