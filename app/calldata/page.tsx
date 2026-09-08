"use client";

import { useTopLoaderRouter } from "@/hooks/useTopLoaderRouter";
import { useEffect } from "react";
import { getPath } from "@/utils";
import subdomains from "@/subdomains";

const Calldata = () => {
  const router = useTopLoaderRouter();

  // /decoder on load
  useEffect(() => {
    router.push(`${getPath(subdomains.CALLDATA.base)}decoder`);
  }, []);

  return <></>;
};

export default Calldata;
