"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getPath } from "@/utils";
import subdomains from "@/subdomains";

const Solidity = () => {
  const router = useRouter();

  useEffect(() => {
    router.push(`${getPath(subdomains.SOLIDITY.base)}compiler`);
  }, []);

  return <></>;
};

export default Solidity;
