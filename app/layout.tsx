import { getMetadata } from "@/utils";
import { IndexLayout as IndexLayoutC } from "./IndexLayout";

export const metadata = {
  ...getMetadata({
    title: "ETH.sh | The Ultimate Ethereum Toolkit",
    description: "The Ultimate Ethereum Toolkit",
    canonical: "https://eth.sh/",
    images: "https://eth.sh/api/og/home",
  }),
  icons: {
    icon: [
      { url: "/favicon.svg?v=eth-mark-3", sizes: "any", type: "image/svg+xml" },
      { url: "/icon.png?v=eth-mark-3", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.ico?v=eth-mark-3",
    apple: [
      { url: "/apple-touch-icon.png?v=eth-mark-3", sizes: "180x180", type: "image/png" },
    ],
  },
};

const IndexLayout = ({ children }: { children: React.ReactNode }) => {
  return <IndexLayoutC>{children}</IndexLayoutC>;
};

export default IndexLayout;
