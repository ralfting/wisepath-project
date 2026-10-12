/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@wisepath/domain", "@wisepath/contract"],
};

module.exports = nextConfig;
