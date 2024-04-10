import { Metadata } from "next";
import { Poppins } from "next/font/google";
import { Providers } from "./providers";
import { Analytics } from "@/components/Analytics";
import { getMetadata } from "@/utils";

const poppins = Poppins({ weight: "400", subsets: ["latin"] });

// export const metadata = getMetadata({
//   title: "Swiss Knife",
//   description: "All your Ethereum dev tools at one place!",
//   images: "https://swiss-knife.xyz/og/index.png",
// });

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en">
      <body className={poppins.className}>
        <Analytics />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
};

export default RootLayout;
