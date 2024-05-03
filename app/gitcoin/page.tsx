"use client";

import { useEffect } from "react";

const ExternalRedirect = () => {
  useEffect(() => {
    window.location.href = "https://explorer.gitcoin.co/#/round/42161/27/33";
  }, []);

  return null;
};

export default ExternalRedirect;
