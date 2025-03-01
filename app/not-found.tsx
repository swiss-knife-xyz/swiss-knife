"use client";

import { useEffect } from "react";
import { getPath } from "@/utils";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the home page
    router.replace(getPath(""));
  }, [router]);

  return (
    <div>
      <h1>Redirecting...</h1>
      <p>Error: Page not found. Redirecting to the home page.</p>
    </div>
  );
}
