/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@wisepath/domain", "@wisepath/contract"],
  // Keep the dev badge off the sidebar's account button
  devIndicators: { position: "bottom-right" },
};

module.exports = nextConfig;
