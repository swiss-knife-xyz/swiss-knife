"use client";

import { useEffect } from "react";

const ExternalRedirect = () => {
  useEffect(() => {
    window.location.href =
      "https://chromewebstore.google.com/detail/swiss-knife/gkelicmkomgpkbkjjkkollllepammhje";
  }, []);

  return null;
};

export default ExternalRedirect;
