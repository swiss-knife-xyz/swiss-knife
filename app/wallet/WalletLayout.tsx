"use client";

import { ReactNode } from "react";
import {
  Box,
  Container,
  Flex,
  Center,
  useBreakpointValue,
} from "@chakra-ui/react";
import { useLocalStorage } from "usehooks-ts";
import { Footer } from "@/components/Footer";
import { MainSidebar } from "@/components/MainSidebar";
import { Sidebar, SidebarItem } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";

const SidebarItems: SidebarItem[] = [{ name: "Wallet Bridge", path: "bridge" }];

interface LayoutParams {
  children: ReactNode;
}

export const BaseLayout = ({ children }: LayoutParams) => {
  const [isNavExpanded, setIsNavExpanded] = useLocalStorage(
    "isNavExpanded",
    false
  );

  const toggleNav = () => {
    setIsNavExpanded(!isNavExpanded);
  };

  // Use breakpoint to determine if we're on mobile
  const isMobile = useBreakpointValue({ base: true, md: false });

  return (
    <Box display="flex" flexDir="column" minHeight="100vh">
      {/* Navbar is always at the top */}
      <Navbar />

      <Box flexGrow={1} overflow="hidden">
        <Flex direction={{ base: "column", md: "row" }} alignItems="flex-start">
          {/* On mobile, sidebar is conditionally rendered based on isNavExpanded */}
          {(!isMobile || isNavExpanded) && (
            <MainSidebar isNavExpanded={isNavExpanded} toggleNav={toggleNav} />
          )}
          <Flex flexDir="column" flexGrow={1} overflow="hidden" width="100%">
            <Box overflowX="hidden" flexGrow={1} width="100%">
              <Container
                mt={{ base: 4, md: 8 }}
                maxW={{ base: "100%", md: "container.xl" }}
                px={{ base: 2, sm: 4, md: isNavExpanded ? 4 : 6 }}
                width="100%"
              >
                <Flex
                  flexDir="column"
                  mt="0.5rem"
                  p={{ base: 2, sm: 4 }}
                  width="100%"
                >
                  {children}
                </Flex>
              </Container>
            </Box>
          </Flex>
        </Flex>
      </Box>
      <Footer />
    </Box>
  );
};

export const WalletLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <BaseLayout>
      <Center>{children}</Center>
    </BaseLayout>
  );
};
