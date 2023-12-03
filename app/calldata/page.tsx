"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getPath } from "@/utils";
import subdomains from "@/subdomains";

const Calldata = () => {
  const router = useRouter();

  useEffect(() => {
    router.push(`${getPath(subdomains.CALLDATA)}decoder`);
  }, []);

  return <></>;
};

export default Calldata;
