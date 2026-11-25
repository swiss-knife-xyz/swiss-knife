"use client";

import { Layout } from "@/components/Layout";

export function TraceLayout({ children }: { children: React.ReactNode }) {
  return (
    <Layout minW={0} allowSticky>
      {children}
    </Layout>
  );
}
