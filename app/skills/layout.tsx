import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Web3 AI Skills | ETH.sh",
  description:
    "A researched directory of Web3 AI skills, MCP servers, CLIs, wallets, models, and protocol tools for onchain agents.",
  images: "https://eth.sh/og/index.png",
});

const SkillsLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default SkillsLayout;
