import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Shared browser storage | ETH.sh",
  robots: { index: false, follow: false },
};
export default function StorageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
