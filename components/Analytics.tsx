"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";

const GA_ID = "G-9BJG2FRNP5";

export const Analytics = () => {
  const pathname = usePathname();

  // The address-book storage iframe is infrastructure, not a user page view.
  if (pathname === "/_storage" || pathname?.startsWith("/_storage/")) {
    return null;
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GA_ID}');
  `,
        }}
      />
    </>
  );
};
