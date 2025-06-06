"use client";

import { ReactNode } from "react";
import { Box, Container, Flex, HStack, FlexProps } from "@chakra-ui/react";
import { useLocalStorage } from "usehooks-ts";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
// import { MainSidebar } from "@/components/MainSidebar";

interface LayoutParams extends FlexProps {
  children: ReactNode;
}

export const Layout = ({ children, ...props }: LayoutParams) => {
  const [isNavExpanded, setIsNavExpanded] = useLocalStorage(
    "isNavExpanded",
    false
  );

  const toggleNav = () => {
    setIsNavExpanded(!isNavExpanded);
  };

  return (
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
  );
};
