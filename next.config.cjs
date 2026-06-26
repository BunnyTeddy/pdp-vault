/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The Synapse SDK ships ESM; let Next transpile it for serverless.
  experimental: {
    serverComponentsExternalPackages: ['@filoz/synapse-sdk', '@filoz/synapse-core'],
  },
};

module.exports = nextConfig;
