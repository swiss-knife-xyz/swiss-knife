import { getMetadata } from "@/utils";
import { IndexLayout as IndexLayoutC } from "./IndexLayout";

export const metadata = {
  ...getMetadata({
    title: "ETH.sh | All your Ethereum dev tools at one place!",
    description: "All your Ethereum dev tools at one place!",
    canonical: "https://eth.sh/",
    images: "https://eth.sh/og/index.png",
  }),
  icons: {
    icon: [{ url: "/icon.png", sizes: "192x192", type: "image/png" }],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

const IndexLayout = ({ children }: { children: React.ReactNode }) => {
  return <IndexLayoutC>{children}</IndexLayoutC>;
};

export default IndexLayout;
