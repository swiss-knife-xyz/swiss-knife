"use client";

import Link from "next/link";
import { Button } from "@chakra-ui/react";
import Layout from "@/components/Layout";
import { getPath } from "@/utils";
import subdomains from "@/subdomains";

export default function Home() {
  return (
    <Layout>
      {/* TODO: auto generate Link Buttons via mapping */}
      <Link href={getPath(subdomains.CONSTANTS)}>
        <Button>Constants</Button>
      </Link>
      <Link href={getPath(subdomains.EPOCH_CONVERTER)}>
        <Button>Epoch Converter</Button>
      </Link>
      <Link href={getPath(subdomains.EXPLORER)}>
        <Button>Explorer</Button>
      </Link>
    </Layout>
  );
}
