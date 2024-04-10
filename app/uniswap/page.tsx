"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getPath } from "@/utils";
import subdomains from "@/subdomains";

const Uniswap = () => {
  const router = useRouter();

  useEffect(() => {
    router.push(`${getPath(subdomains.UNISWAP.base)}tick-to-price`);
  }, []);

  return <></>;
};

export default Uniswap;
