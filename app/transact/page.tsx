"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getPath } from "@/utils";
import subdomains from "@/subdomains";

const Transact = () => {
  const router = useRouter();

  useEffect(() => {
    router.push(`${getPath(subdomains.TRANSACT)}send-tx`);
  }, []);

  return <></>;
};

export default Transact;
