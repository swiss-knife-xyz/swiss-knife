/** @type {import('next').NextConfig} */
const subdomains = ["constants"];

const nextConfig = {
  reactStrictMode: true,
  rewrites() {
    return {
      beforeFiles: [
        ...subdomains.map((subdomain) => ({
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
