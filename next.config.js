/** @type {import('next').NextConfig} */
const subdomains = require("./subdomains.js");
require("dotenv/config");

const nextConfig = {
  reactStrictMode: true,
  rewrites() {
    return {
      beforeFiles: [
        // Rewrite for static assets in the public folder
        {
          source: "/chainIcons/:asset*",
          destination: "/chainIcons/:asset*",
        },
        {
          source: "/icon.png",
          destination: "/icon.png",
        },
        // set up subdomains
        ...Object.values(subdomains).map((subdomain) => ({
          source: "/:path((?!_next|chainIcons|icon.png).*)", // Exclude chainIcons from subdomain rewrites
          has: [
            {
              type: "host",
              value: `${subdomain.base}.swiss-knife.xyz`,
            },
          ],
          destination: `/${subdomain.base}/:path*`,
        })),
      ],
    };
  },
  redirects() {
    return [
      {
        source: "/discord",
        destination: process.env.DISCORD_URL,
        permanent: true,
      },
    ];
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.externals.push("pino-pretty");
    return config;
  },
  compiler: {
    styledComponents: true,
  },
  experimental: {
    windowHistorySupport: true,
  },
};

module.exports = nextConfig;
