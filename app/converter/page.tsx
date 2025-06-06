"use client";

import { useTopLoaderRouter } from "@/hooks/useTopLoaderRouter";
import { useEffect } from "react";
import { getPath } from "@/utils";
import subdomains from "@/subdomains";

const Converter = () => {
  const router = useTopLoaderRouter();

  useEffect(() => {
    router.push(`${getPath(subdomains.CONVERTER.base)}eth`);
  }, []);

  return <></>;
};

export default Converter;
