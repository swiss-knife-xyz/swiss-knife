"use client";

import { ReactNode } from "react";
import {
  Box,
  HStack,
  Container,
  Flex,
  Center,
  useDisclosure,
  useBreakpointValue,
  IconButton,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Text,
} from "@chakra-ui/react";
import { HamburgerIcon } from "@chakra-ui/icons";
import { Layout } from "@/components/Layout";
import { Sidebar, SidebarItem } from "@/components/Sidebar";
import subdomains from "@/subdomains";

const SidebarItems: SidebarItem[] = [
  { name: "Wallet Bridge", path: "bridge" },
  { name: "DSProxy", path: "ds-proxy" },
  { name: "Signatures", path: "signatures" },
];

interface LayoutParams {
  children: ReactNode;
}

export const BaseLayout = ({ children }: LayoutParams) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const isMobile = useBreakpointValue({ base: true, md: false });

  return (
    <Layout>
      <HStack alignItems={"stretch"} h="full" w="full">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <Sidebar
            heading="Wallet"
            items={SidebarItems}
            subdomain={subdomains.WALLET.base}
          />
        )}

        <Box flexGrow={1} overflow="hidden" width={"100%"}>
          <Flex
            direction={{ base: "column", md: "row" }}
            alignItems="flex-start"
          >
            <Flex flexDir="column" flexGrow={1} overflow="hidden" width="100%">
              <Box overflowX="hidden" flexGrow={1} width="100%">
                <Container
                  mt={{ base: 0, md: 8 }}
                  maxW={{ base: "100%", md: "container.xl" }}
                  px={{ base: 2, sm: 4, md: 6 }}
                  width="100%"
                >
                  {/* Mobile Hamburger Menu */}
                  {isMobile && (
                    <Box mb={8} display="flex" justifyContent="flex-start">
                      <HStack
                        p={0}
                        pr={2}
                        bg="whiteAlpha.100"
                        rounded="md"
                        as="button"
                        type="button"
                        onClick={onOpen}
                        _hover={{ bg: "whiteAlpha.200", cursor: "pointer" }}
                        spacing={2}
                      >
                        <IconButton
                          aria-label="Open menu"
                          icon={<HamburgerIcon />}
                          variant="ghost"
                          color="white"
                          colorScheme="whiteAlpha"
                          size="xs"
                          tabIndex={-1} 
                        />
                        <Text fontSize="xs">Wallet Tools</Text>
                      </HStack>
                    </Box>
                  )}

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

        {/* Mobile Drawer */}
        {isMobile && (
          <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
            <DrawerOverlay backdropFilter="blur(5px)" />
            <DrawerContent bg="bg.900" maxW="280px">
              <DrawerCloseButton />
              <DrawerHeader borderBottomWidth="1px" color="green.200">
                💸 Wallet
              </DrawerHeader>
              <DrawerBody p={0}>
                <Box onClick={onClose}>
                  <Sidebar
                    heading=""
                    items={SidebarItems}
                    subdomain={subdomains.WALLET.base}
                    showBorders={false}
                    showHeading={false}
                  />
                </Box>
              </DrawerBody>
            </DrawerContent>
          </Drawer>
        )}
      </HStack>
    </Layout>
  );
};

export const WalletLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <BaseLayout>
      <Center>{children}</Center>
    </BaseLayout>
  );
};
