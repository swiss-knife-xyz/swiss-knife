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
          source: "/favicon.svg",
          destination: "/favicon.svg",
        },
        {
          source: "/logo.svg",
          destination: "/logo.svg",
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
        ...Object.values(subdomains)
          .filter((subdomain) => !subdomain.isRelativePath)
          .flatMap((subdomain) => [
            {
              source:
                "/:path((?!_next|api|og(?:/|$)|frame(?:/|$)|robots\\.txt$|sitemap\\.xml$|favicon\\.(?:ico|svg)$|apple-touch-icon\\.png$|chainIcons|tokenIcons|external|icon.png|logo.png|logo\\.svg$|splashImage.png|worker).*)", // Exclude API routes, static assets and worker from subdomain rewrites
              has: [
                {
                  type: "host",
                  value: `${subdomain.base}\\.eth\\.sh`,
                },
              ],
              destination: `/${subdomain.base}/:path*`,
            },
          ]),
      ],
    };
  },
  headers() {
    return [
      {
        source: "/api/:path((?!og(?:/|$)).*)",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
  redirects() {
    return [
      // The tracer is now a standalone tool. Query parameters pass through.
      {
        source: "/trace",
        has: [{ type: "host", value: "calldata\\.eth\\.sh" }],
        destination: "https://trace.eth.sh/",
        permanent: true,
      },
      {
        source: "/calldata/trace",
        has: [{ type: "host", value: "(?:www\\.)?eth\\.sh" }],
        destination: "https://trace.eth.sh/",
        permanent: true,
      },
      {
        source: "/calldata/trace",
        missing: [{ type: "host", value: "(?:.*\\.)?eth\\.sh" }],
        destination: "/trace",
        permanent: true,
      },
      {
        source: "/api/og/calldata-trace",
        destination: "/api/og/trace",
        permanent: true,
      },
      {
        source: "/",
        has: [{ type: "host", value: "(?:determine-address|contract-address)\\.eth\\.sh" }],
        destination: "https://eth.sh/determine-address",
        permanent: true,
      },
      {
        source: "/contract-address",
        has: [{ type: "host", value: "(?:www\\.)?eth\\.sh" }],
        destination: "https://eth.sh/determine-address",
        permanent: true,
      },
      {
        source: "/og/migrate.png",
        destination: "https://eth.sh/api/og/migrate",
        permanent: true,
      },
      {
        source: "/frame/wallet-bridge.png",
        destination: "https://eth.sh/api/og/wallet-bridge",
        permanent: true,
      },
      // Retired Send Tx subpaths point directly to the tool root.
      {
        source: "/send-tx",
        has: [{ type: "host", value: "(?:transact|tx)\\.eth\\.sh" }],
        destination: "https://tx.eth.sh/",
        permanent: true,
      },
      {
        source: "/:tool(transact|tx)/send-tx",
        has: [{ type: "host", value: "(?:www\\.)?eth\\.sh" }],
        destination: "https://tx.eth.sh/",
        permanent: true,
      },
      {
        source: "/:tool(transact|tx)/send-tx",
        missing: [{ type: "host", value: "(?:.*\\.)?eth\\.sh" }],
        destination: "/tx",
        permanent: true,
      },
      // Transact moved to tx.eth.sh. Next preserves all incoming query params
      // because these destinations consume only path parameters.
      {
        source: "/",
        has: [{ type: "host", value: "transact\\.eth\\.sh" }],
        destination: "https://tx.eth.sh/",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "transact\\.eth\\.sh" }],
        destination: "https://tx.eth.sh/:path*",
        permanent: true,
      },
      {
        source: "/transact",
        has: [{ type: "host", value: "(?:www\\.)?eth\\.sh" }],
        destination: "https://tx.eth.sh/",
        permanent: true,
      },
      {
        source: "/transact/:path*",
        has: [{ type: "host", value: "(?:www\\.)?eth\\.sh" }],
        destination: "https://tx.eth.sh/:path*",
        permanent: true,
      },
      {
        source: "/transact",
        missing: [{ type: "host", value: "(?:.*\\.)?eth\\.sh" }],
        destination: "/tx",
        permanent: true,
      },
      {
        source: "/transact/:path*",
        missing: [{ type: "host", value: "(?:.*\\.)?eth\\.sh" }],
        destination: "/tx/:path*",
        permanent: true,
      },
      {
        source: "/",
        has: [{ type: "host", value: "orgs.eth.sh" }],
        destination: "https://eth.sh/orgs",
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
