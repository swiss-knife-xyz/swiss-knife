"use client";

import { useTopLoaderRouter } from "@/hooks/useTopLoaderRouter";
import { useEffect } from "react";
import { getPath } from "@/utils";
import subdomains from "@/subdomains";

const Transact = () => {
  const router = useTopLoaderRouter();

  useEffect(() => {
    router.push(`${getPath(subdomains.TRANSACT.base)}send-tx`);
  }, []);

  return <></>;
};

export default Transact;
