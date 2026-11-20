"use client";
import { Box, Link } from "@chakra-ui/react";
import { Layout } from "@/components/Layout";
import { getPath } from "@/utils";
import { VerificationTool } from "./VerificationTool";
export function VerificationPage() {
  return (
    <Layout minW={0}>
      <Box pb={8} minW={0}>
        <Link
          href={getPath("contract")}
          color="blue.300"
          display="inline-block"
          mb={4}
        >
          ← Contract Explorer
        </Link>
        <VerificationTool />
      </Box>
    </Layout>
  );
}
