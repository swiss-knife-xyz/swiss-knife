import { Metadata } from "next";
import { Poppins } from "next/font/google";
import { Providers } from "@/app/providers";
import { Analytics } from "@/components/Analytics";

const poppins = Poppins({ weight: "400", subsets: ["latin"] });

export const IndexLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en">
      <body className={poppins.className}>
        <Analytics />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
};
