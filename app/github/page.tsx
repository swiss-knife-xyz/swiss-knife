"use client";

import { useEffect } from "react";

const ExternalRedirect = () => {
  useEffect(() => {
    window.location.href = "https://github.com/swiss-knife-xyz/swiss-knife";
  }, []);

  return null;
};

export default ExternalRedirect;
