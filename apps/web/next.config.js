/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@wisepath/domain", "@wisepath/contract"],
  // Keep the dev badge off the sidebar's account button
  devIndicators: { position: "bottom-right" },
  // In production the API is reached through the web app's own origin, so the
  // session cookie it sets belongs to this domain and middleware.ts can read it
  async rewrites() {
    if (!process.env.API_ORIGIN) return [];
    return [{ source: "/api/:path*", destination: `${process.env.API_ORIGIN}/api/:path*` }];
  },
};

module.exports = nextConfig;
