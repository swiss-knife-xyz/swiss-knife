"use client";

import { useTopLoaderRouter } from "@/hooks/useTopLoaderRouter";
import { useEffect } from "react";
import { getPath } from "@/utils";
import subdomains from "@/subdomains";

const Wallet = () => {
  const router = useTopLoaderRouter();

  useEffect(() => {
    router.push(`${getPath(subdomains.WALLET.base)}bridge`);
  }, []);

  return <></>;
};

export default Wallet;
