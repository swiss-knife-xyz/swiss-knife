"use client";

import { useTopLoaderRouter } from "@/hooks/useTopLoaderRouter";
import { useEffect } from "react";
import { getPath } from "@/utils";
import subdomains from "@/subdomains";

const ENS = () => {
  const router = useTopLoaderRouter();

  useEffect(() => {
    router.push(`${getPath(subdomains.ENS.base)}history`);
  }, []);

  return <></>;
};

export default ENS;
