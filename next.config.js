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
          source: "/external/:asset*",
          destination: "/external/:asset*",
        },
        {
          source: "/icon.png",
          destination: "/icon.png",
        },
        // set up subdomains (exclude api routes from subdomain rewrites)
        ...Object.values(subdomains).map((subdomain) => ({
          source: "/:path((?!_next|api|chainIcons|external|icon.png|worker).*)", // Exclude API routes, static assets and worker from subdomain rewrites
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

    // Add WebAssembly support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

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
