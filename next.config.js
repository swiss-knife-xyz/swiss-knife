/** @type {import('next').NextConfig} */
const subdomains = require("./subdomains.js");
require("dotenv/config");

const nextConfig = {
  reactStrictMode: true,
  // Enable Turbopack with empty config (webpack config still applies when needed)
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
  rewrites() {
    return {
      beforeFiles: [
        // Rewrite for static assets in the public folder
        {
          source: "/chainIcons/:asset*",
          destination: "/chainIcons/:asset*",
        },
        {
          source: "/tokenIcons/:asset*",
          destination: "/tokenIcons/:asset*",
        },
        {
          source: "/external/:asset*",
          destination: "/external/:asset*",
        },
        {
          source: "/icon.png",
          destination: "/icon.png",
        },
        {
          source: "/logo.png",
          destination: "/logo.png",
        },
        {
          source: "/splashImage.png",
          destination: "/splashImage.png",
        },
        // set up subdomains (exclude api routes, static assets and worker from subdomain rewrites)
        ...Object.values(subdomains).flatMap((subdomain) => [
          {
            source:
              "/:path((?!_next|api|og(?:/|$)|frame(?:/|$)|robots\\.txt$|sitemap\\.xml$|favicon\\.ico$|chainIcons|tokenIcons|external|icon.png|logo.png|splashImage.png|worker).*)", // Exclude API routes, static assets and worker from subdomain rewrites
            has: [
              {
                type: "host",
                value: `${subdomain.base}.eth.sh`,
              },
            ],
            destination: `/${subdomain.base}/:path*`,
          },
        ]),
      ],
    };
  },
  headers() {
    return [{
      source: "/api/:path((?!og(?:/|$)).*)",
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
    }];
  },
  redirects() {
    return [
      {
        source: "/contract/:chainId/:address",
        has: [{ type: "host", value: "explorer.eth.sh" }],
        destination: "https://contract.eth.sh/:chainId/:address",
        permanent: true,
      },
      {
        source: "/explorer/contract/:chainId/:address",
        has: [{ type: "host", value: "eth.sh" }],
        destination: "https://contract.eth.sh/:chainId/:address",
        permanent: true,
      },
      {
        source: "/",
        has: [{ type: "host", value: "orgs.eth.sh" }],
        destination: "https://eth.sh/orgs",
        permanent: true,
      },
      // Preserve the legacy back-link without masking unknown contract paths.
      {
        source: "/contract",
        has: [{ type: "host", value: "contract.eth.sh" }],
        destination: "https://contract.eth.sh/",
        permanent: true,
      },
      {
        source: "/discord",
        destination: process.env.DISCORD_URL || "https://discord.com",
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
  turbopack: {},
  compiler: {
    styledComponents: true,
  },
};

module.exports = nextConfig;
