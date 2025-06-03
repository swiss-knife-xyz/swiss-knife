"use client";

import { ReactNode } from "react";
import { Box, Container, Flex, HStack } from "@chakra-ui/react";
import { AppProgressProvider as ProgressProvider } from "@bprogress/next";
import { useLocalStorage } from "usehooks-ts";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
// import { MainSidebar } from "@/components/MainSidebar";

interface LayoutParams {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutParams) => {
  const [isNavExpanded, setIsNavExpanded] = useLocalStorage(
    "isNavExpanded",
    false
  );

  const toggleNav = () => {
    setIsNavExpanded(!isNavExpanded);
  };

  return (
    <ProgressProvider
      height="2px"
      color="#e84142"
      options={{ showSpinner: false }}
      shallowRouting
    >
      <Box display="flex" flexDir="column" minHeight="100vh">
        <Box flexGrow={1} overflow="hidden">
          <HStack alignItems="flex-start" spacing={0}>
            {/* <MainSidebar isNavExpanded={isNavExpanded} toggleNav={toggleNav} /> */}
            <Flex flexDir="column" flexGrow={1} overflow="hidden">
              <Navbar />
              <Box overflowX="auto" flexGrow={1}>
                <Container mt={8} minW="max-content" px={6} maxW="full">
                  {children}
                </Container>
              </Box>
            </Flex>
          </HStack>
        </Box>
        <Footer />
      </Box>
    </ProgressProvider>
  );
};
