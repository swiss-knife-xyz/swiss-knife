import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explorer Directory | ETH.sh",
  alternates: { canonical: null },
  robots: { index: false, follow: true },
};

export default function AliasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
