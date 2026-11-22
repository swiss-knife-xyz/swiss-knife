"use client";
import { Box } from "@chakra-ui/react";
import { Layout } from "@/components/Layout";
import { RpcTool } from "./RpcTool";
export function RpcPage() {
  return (
    <Layout minW={0}>
      <Box pb={8} minW={0}>
        <RpcTool />
      </Box>
    </Layout>
  );
}
