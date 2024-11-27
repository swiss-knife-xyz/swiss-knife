import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Viem Error Simulate | Swiss-Knife.xyz",
  description:
    "Paste viem contract error from console and simulate on Tenderly to debug.",
  images: "https://swiss-knife.xyz/og/calldata-viem-error-simulate.png",
});

const ViemErrorSimulateLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return <>{children}</>;
};

export default ViemErrorSimulateLayout;
