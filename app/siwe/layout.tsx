import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "SIWE Validator | Swiss-Knife.xyz",
  description:
    "Validate, lint, and debug Sign in with Ethereum (SIWE) messages for EIP-4361 validity, security best practices, and proper formatting.",
  images: "https://swiss-knife.xyz/og/siwe.png",
});

const SiweLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default SiweLayout;

