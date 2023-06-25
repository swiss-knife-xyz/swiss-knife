export const getPath = (subdomain: string) => {
  return process.env.NEXT_PUBLIC_DEVELOPMENT === "true"
    ? `/${subdomain}`
    : `https://${subdomain}.swiss-knife.xyz/`;
};
