import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "SIWE Validator | ETH.sh",
  description:
    "Validate, lint, and debug Sign in with Ethereum (SIWE) messages for EIP-4361 validity, security best practices, and proper formatting.",
  canonical: "https://siwe.eth.sh/",
  images: "https://eth.sh/og/siwe.png",
});

const SiweLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default SiweLayout;

