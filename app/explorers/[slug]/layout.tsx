import type { Metadata } from "next";

// This transient search resolves to an address/transaction view after hydration.
export const metadata: Metadata = {
  alternates: { canonical: null },
  openGraph: { url: undefined },
  robots: { index: false, follow: true },
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
