"use client";

import { ReactNode } from "react";
import { Box, Flex, HStack } from "@chakra-ui/react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

interface LayoutParams {
  children: ReactNode;
}

export const CompilerLayout = ({ children }: LayoutParams) => {
  return (
    <Box display="flex" flexDir="column" minHeight="100vh">
      <Box flexGrow={1} overflow="hidden">
        <HStack alignItems="flex-start" spacing={0}>
          <Flex flexDir="column" flexGrow={1} overflow="hidden">
            <Navbar />
            {children}
          </Flex>
        </HStack>
      </Box>
      <Footer />
    </Box>
  );
};
