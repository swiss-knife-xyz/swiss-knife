import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New Web3 AI Skills | ETH.sh",
  description:
    "A screenshot-ready view of newly added Web3 AI skills and MCP servers.",
  openGraph: {
    images: [],
  },
  robots: {
    index: false,
    follow: false,
  },
  twitter: {
    images: [],
  },
};

const NewSkillsLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default NewSkillsLayout;
