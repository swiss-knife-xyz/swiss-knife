import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Privacy Protocols | ETH.sh",
  description:
    "Compare Tornado Cash, RAILGUN, Privacy Pools, and Veil Cash by chains, assets, fees, wait times, transfer support, cryptography, and compliance model.",
  images: "https://eth.sh/api/og/privacy",
});

const PrivacyLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default PrivacyLayout;
