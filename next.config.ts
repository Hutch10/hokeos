/**
 * Phase 39: Production Configuration
 * Standalone output for serverless deployment.
 */
const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: __dirname,
  typescript: {
    ignoreBuildErrors: false,
  },
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
