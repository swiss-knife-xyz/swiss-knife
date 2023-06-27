"use client";

import Link from "next/link";
import { Button } from "@chakra-ui/react";
import Layout from "@/components/Layout";
import { getPath } from "@/utils";
import subdomains from "@/subdomains.json";

export default function Home() {
  return (
    <Layout>
      {/* TODO: auto generate Link Buttons via mapping */}
      <Link href={getPath(subdomains[0])}>
        <Button>Constants</Button>
      </Link>
      <Link href={getPath(subdomains[1])}>
        <Button>Epoch Converter</Button>
      </Link>
      <Link href={getPath(subdomains[2])}>
        <Button>Explorer</Button>
      </Link>
    </Layout>
  );
}
