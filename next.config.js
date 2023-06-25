/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  rewrites() {
    return {
      beforeFiles: [
        {
          source: "/:path*",
          has: [
            {
              type: "host",
              value: "constants.swiss-knife.xyz",
            },
          ],
          destination: "/constants/:path*",
        },
      ],
    };
  },
};

module.exports = nextConfig;
