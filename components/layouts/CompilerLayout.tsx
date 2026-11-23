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
      {/* clip constrains wide content without creating a scroll container that breaks sticky panes. */}
      <Box flexGrow={1} overflowX="clip">
        <HStack alignItems="flex-start" spacing={0}>
          <Flex flexDir="column" flexGrow={1} minW={0} overflowX="clip">
            <Navbar />
            {children}
          </Flex>
        </HStack>
      </Box>
      <Footer />
    </Box>
  );
};
