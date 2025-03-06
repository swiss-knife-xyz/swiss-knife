"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getPath } from "@/utils";
import subdomains from "@/subdomains";

const ENS = () => {
  const router = useRouter();

  useEffect(() => {
    router.push(`${getPath(subdomains.ENS.base)}content-changes`);
  }, []);

  return <></>;
};

export default ENS;
