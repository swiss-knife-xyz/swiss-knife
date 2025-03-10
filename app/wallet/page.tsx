"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getPath } from "@/utils";
import subdomains from "@/subdomains";

const Wallet = () => {
  const router = useRouter();

  useEffect(() => {
    router.push(`${getPath(subdomains.WALLET.base)}bridge`);
  }, []);

  return <></>;
};

export default Wallet;
