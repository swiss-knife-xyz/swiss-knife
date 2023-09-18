/** @type {import('next').NextConfig} */
const subdomains = require("./subdomains.js");

const nextConfig = {
  reactStrictMode: true,
  rewrites() {
    return {
      beforeFiles: [
        ...Object.values(subdomains).map((subdomain) => ({
          source: "/:path((?!_next).*)",
          has: [
            {
              type: "host",
              value: `${subdomain}.swiss-knife.xyz`,
            },
          ],
          destination: `/${subdomain}/:path*`,
        })),
      ],
    };
  },
};

module.exports = nextConfig;
