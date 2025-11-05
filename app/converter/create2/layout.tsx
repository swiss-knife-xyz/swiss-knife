import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "CREATE2 Address Calculator | Swiss-Knife.xyz",
  description: "Calculate a contract address using CREATE2.",
  images: "https://swiss-knife.xyz/og/converter-create2.png",
});

const Create2Layout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default Create2Layout;
