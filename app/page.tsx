"use client";

import Link from "next/link";
import { Button } from "@chakra-ui/react";
import Layout from "@/components/Layout";
import { getPath } from "@/utils";
import subdomains from "@/subdomains.json";

export default function Home() {
  return (
    <Layout>
      <Link href={getPath(subdomains[0])}>
        <Button>Constants</Button>
      </Link>
      <Link href={getPath(subdomains[1])}>
        <Button>Epoch Converter</Button>
      </Link>
    </Layout>
  );
}
