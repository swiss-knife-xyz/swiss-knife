"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getPath } from "@/utils";
import subdomains from "@/subdomains";

const Foundry = () => {
  const router = useRouter();

  useEffect(() => {
    router.push(`${getPath(subdomains.FOUNDRY.base)}forge-stack-tracer-ui`);
  }, []);

  return <></>;
};

export default Foundry;
