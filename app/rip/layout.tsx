import type { Metadata } from "next";

const title = "R.I.P. - Web3 projects that shut down | ETH.sh";
const description =
  "Explore web3 projects that shut down or are winding down. Browse the timeline, project logos, shutdown dates, and original announcements.";
const image = "https://eth.sh/api/og/rip";
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "https://rip.eth.sh/" },
  openGraph: {
    title,
    description,
    type: "website",
    url: "https://rip.eth.sh/",
    siteName: "ETH.sh",
    images: [
      {
        url: image,
        width: 1200,
        height: 630,
        alt: "R.I.P. — Web3 projects that shut down, with a grid of project logos",
      },
    ],
  },
  twitter: { card: "summary_large_image", title, description, images: [image] },
};
export default function RipLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
