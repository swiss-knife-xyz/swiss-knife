"use client";
import { Box, Link } from "@chakra-ui/react";
import { ArrowLeft } from "lucide-react";
import { Layout } from "@/components/Layout";
import { getPath } from "@/utils";
import { VerificationTool } from "./VerificationTool";
export function VerificationPage() {
  return (
    <Layout minW={0}>
      <Box pb={8} minW={0} maxW="56rem" mx="auto">
        <Link
          href={getPath("explorer")}
          color="text.secondary"
          fontSize="sm"
          alignItems="center"
          gap={2}
          display="inline-flex"
          mb={5}
        >
          <ArrowLeft size={14} aria-hidden="true" /> Contract Explorer
        </Link>
        <VerificationTool />
      </Box>
    </Layout>
  );
}
