"use client";

import { ReactNode } from "react";
import { Box, Container, Flex, HStack, FlexProps } from "@chakra-ui/react";
import { useLocalStorage } from "usehooks-ts";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

interface LayoutParams extends FlexProps {
  children: ReactNode;
  /**
   * Opt out of the default ancestor `overflow: hidden | auto` wrappers so
   * descendants can use `position: sticky`. Use when the page has no wide
   * content that needs horizontal scrolling.
   */
  allowSticky?: boolean;
}

export const Layout = ({ children, allowSticky, ...props }: LayoutParams) => {
  const [isNavExpanded, setIsNavExpanded] = useLocalStorage(
    "isNavExpanded",
    false
  );

  const toggleNav = () => {
    setIsNavExpanded(!isNavExpanded);
  };

  const wrapperOverflow = allowSticky ? "visible" : "hidden";
  const innerOverflowX = allowSticky ? "visible" : "auto";

  return (
    <Box display="flex" flexDir="column" minHeight="100vh" bg="bg.base">
      <Box flexGrow={1} overflow={wrapperOverflow}>
        <HStack alignItems="flex-start" spacing={0}>
          <Flex flexDir="column" flexGrow={1} overflow={wrapperOverflow}>
            <Navbar />
            <Box overflowX={innerOverflowX} flexGrow={1}>
              <Container
                mt={8}
                minW={allowSticky ? undefined : "max-content"}
                px={{ base: 4, md: 6 }}
                maxW="container.xl"
                {...props}
              >
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
