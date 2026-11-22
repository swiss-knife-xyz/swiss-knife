"use client";
import { useEffect } from "react";
import { initializeCustomChains } from "@/lib/customChains/store";
export function CustomChainsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    void initializeCustomChains();
  }, []);
  return children;
}
