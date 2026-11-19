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
        ...Object.values(subdomains)
          .filter((subdomain) => subdomain.base !== "explorers")
          .flatMap((subdomain) => [
            {
              source:
                "/:path((?!_next|api|og(?:/|$)|frame(?:/|$)|robots\\.txt$|sitemap\\.xml$|favicon\\.ico$|apple-touch-icon\\.png$|chainIcons|tokenIcons|external|icon.png|logo.png|splashImage.png|worker).*)", // Exclude API routes, static assets and worker from subdomain rewrites
              has: [
                {
                  type: "host",
                  value: `${subdomain.base === "contract" ? "explorer" : subdomain.base}\\.eth\\.sh`,
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
      ...[
        "explorer.eth.sh",
        "explorer.swiss-knife.xyz",
        "eth.sh",
        "swiss-knife.xyz",
      ].flatMap((host) =>
        (host === "eth.sh" || host === "swiss-knife.xyz"
          ? ["/explorer", "/explorers"]
          : [""]
        ).flatMap((prefix) => [
          {
            source: `${prefix}/address/:address/contract`,
            has: [
              { type: "host", value: host.replaceAll(".", "\\.") },
              { type: "query", key: "chainId", value: "(?<chainId>\\d+)" },
            ],
            destination: "https://explorer.eth.sh/:chainId/:address",
            permanent: true,
          },
          {
            source: `${prefix}/address/:address/contract/:chainId`,
            has: [{ type: "host", value: host.replaceAll(".", "\\.") }],
            destination: "https://explorer.eth.sh/:chainId/:address",
            permanent: true,
          },
          {
            source: `${prefix}/address/:address/contract`,
            has: [{ type: "host", value: host.replaceAll(".", "\\.") }],
            destination: "https://explorer.eth.sh/1/:address",
            permanent: true,
          },
        ])
      ),
      // Never point contract.eth.sh back to explorer's old /contract prefix:
      // browsers may have cached that prefix's permanent hop to contract.eth.sh.
      ...[
        "eth.sh",
        "explorer.eth.sh",
        "explorer.swiss-knife.xyz",
        "contract.eth.sh",
        "contract.swiss-knife.xyz",
        "swiss-knife.xyz",
      ].flatMap((host) => [
        ...[
          "/contract/:chainId/:address",
          "/explorer/contract/:chainId/:address",
          "/explorers/contract/:chainId/:address",
        ].map((source) => ({
          source,
          has: [{ type: "host", value: host.replaceAll(".", "\\.") }],
          destination: "https://explorer.eth.sh/:chainId/:address",
          permanent: true,
        })),
        {
          source: "/contract",
          has: [{ type: "host", value: host.replaceAll(".", "\\.") }],
          destination: "https://explorer.eth.sh/",
          permanent: true,
        },
      ]),
      ...["contract.eth.sh", "contract.swiss-knife.xyz"].flatMap((host) => [
        {
          source: "/",
          has: [{ type: "host", value: host.replaceAll(".", "\\.") }],
          destination: "https://explorer.eth.sh/",
          permanent: true,
        },
        {
          source: "/:chainId(\\d+)/:address",
          has: [{ type: "host", value: host.replaceAll(".", "\\.") }],
          destination: "https://explorer.eth.sh/:chainId/:address",
          permanent: true,
        },
      ]),
      ...["eth.sh", "swiss-knife.xyz"].map((host) => ({
        source: "/explorer/:path*",
        has: [{ type: "host", value: host.replaceAll(".", "\\.") }],
        destination: "https://eth.sh/explorers/:path*",
        permanent: true,
      })),
      ...["explorer.eth.sh", "explorer.swiss-knife.xyz"].flatMap((host) => [
        ...["address/:address", "tx/:tx", "explorers/:path*"].map((path) => ({
          source: `/${path}`,
          has: [{ type: "host", value: host.replaceAll(".", "\\.") }],
          destination: `https://eth.sh/${path.startsWith("explorers/") ? path : `explorers/${path}`}`,
          permanent: true,
        })),
        // A single segment was the directory's address/ENS search, not a chain link.
        {
          source: "/:slug(0x[a-fA-F0-9]{40}|0x[a-fA-F0-9]{64}|[^/]+\\.eth)",
          has: [{ type: "host", value: host.replaceAll(".", "\\.") }],
          destination: "https://eth.sh/explorers/:slug",
          permanent: true,
        },
      ]),
      {
        source: "/",
        has: [
          { type: "host", value: "explorer\\.eth\\.sh" },
          { type: "query", key: "forContracts" },
        ],
        destination: "https://eth.sh/explorers",
        permanent: true,
      },
      {
        source: "/",
        has: [{ type: "host", value: "explorer\\.swiss-knife\\.xyz" }],
        destination: "https://eth.sh/explorers",
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
