"use client";

import { useTopLoaderRouter } from "@/hooks/useTopLoaderRouter";
import { useEffect } from "react";
import { getPath } from "@/utils";
import subdomains from "@/subdomains";

const Foundry = () => {
  const router = useTopLoaderRouter();

  useEffect(() => {
    router.push(`${getPath(subdomains.FOUNDRY.base)}forge-stack-tracer-ui`);
  }, []);

  return <></>;
};

export default Foundry;
