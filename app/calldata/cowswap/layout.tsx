import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "CoW Protocol TWAP Verifier | ETH.sh",
  description:
    "Decode a ComposableCoW TWAP order and verify its appData hash against the CoW API.",
  images: "https://eth.sh/og/calldata-cowswap.png",
});

const Layout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default Layout;
