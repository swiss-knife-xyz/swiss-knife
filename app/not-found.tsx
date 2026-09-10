"use client";

import { useTopLoaderRouter } from "@/hooks/useTopLoaderRouter";
import { useEffect } from "react";
import { getPath } from "@/utils";

export default function NotFound() {
  const router = useTopLoaderRouter();

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
