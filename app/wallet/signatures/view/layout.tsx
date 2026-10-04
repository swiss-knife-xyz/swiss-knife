import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Signature inspection | ETH.sh",
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export default function PrivateViewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
