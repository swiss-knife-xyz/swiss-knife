"use client";

import { ReactNode } from "react";
import {
  Box,
  Container,
  Flex,
  HStack,
  useBreakpointValue,
} from "@chakra-ui/react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

interface LayoutParams {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutParams) => {
  const isMobile = useBreakpointValue({ base: true, md: false });

  return (
    <Box display="flex" flexDir="column" minHeight="100vh">
      <Box flexGrow={1} overflow="hidden">
        <HStack alignItems="flex-start" spacing={0}>
          {/* <MainSidebar isNavExpanded={isNavExpanded} toggleNav={toggleNav} /> */}
          <Flex flexDir="column" flexGrow={1} overflow="hidden">
            <Navbar />
            <Box overflowX="auto" flexGrow={1}>
              <Container mt={isMobile ? 0 : 20} minW="max-content" px={-20} mb={"6rem"}>
                <Flex
                  flexDir="column"
                  mt="0.5rem"
                  p="4"
                  pt={isMobile ? 0 : "4"}
                  border="1px"
                  borderColor="whiteAlpha.700"
                  borderStyle={isMobile ? "none" : "dotted"}
                  rounded="lg"
                >
                  {children}
                </Flex>
              </Container>
            </Box>
          </Flex>
        </HStack>
      </Box>
      <Footer />
    </Box>
  );
};
