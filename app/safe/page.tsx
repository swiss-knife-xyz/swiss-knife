"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getPath } from "@/utils";
import subdomains from "@/subdomains";

const Safe = () => {
  const router = useRouter();

  useEffect(() => {
    router.push(`${getPath(subdomains.SAFE.base)}eip-712-hash`);
  }, []);

  return <></>;
};

export default Safe;
