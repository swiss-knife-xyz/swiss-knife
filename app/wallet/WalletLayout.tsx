"use client";

import Link from "next/link";
import { ReactNode } from "react";
import {
  Box,
  Container,
  Flex,
  HStack,
  Center,
  useBreakpointValue,
  Heading,
  Image,
  Link as ChakraLink,
  VStack,
  useDisclosure,
  IconButton,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from "@chakra-ui/react";
import { HamburgerIcon } from "@chakra-ui/icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { useLocalStorage } from "usehooks-ts";
import { baseURL } from "@/config";
import { getPath } from "@/utils";
import { Footer } from "@/components/Footer";
import { MainSidebar } from "@/components/MainSidebar";
import { Sidebar, SidebarItem } from "@/components/Sidebar";
import subdomains from "@/subdomains";

const SidebarItems: SidebarItem[] = [{ name: "Wallet Bridge", path: "bridge" }];

interface LayoutParams {
  children: ReactNode;
}

export const NewNavbar = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isMenuOpen,
    onOpen: onMenuOpen,
    onClose: onMenuClose,
  } = useDisclosure();
  const isMobile = useBreakpointValue({ base: true, md: false });

  return (
    <VStack w="100%" spacing={0}>
      {/* Main Navbar */}
      <Flex
        w="100%"
        py={3}
        px={4}
        alignItems="center"
        justifyContent="space-between"
        borderBottom="1px solid"
        borderColor="whiteAlpha.200"
        bg="blackAlpha.400"
      >
        {/* Logo */}
        <Link href={baseURL}>
          <HStack spacing={{ base: "2", sm: "3" }}>
            <Image
              w={{ base: "2rem", sm: "2.5rem" }}
              h={{ base: "2rem", sm: "2.5rem" }}
              alt="icon"
              src="/icon.png"
              rounded="lg"
            />
            <Heading
              color="custom.pale"
              fontSize={{ base: "lg", sm: "xl", md: "2xl" }}
              display={{ base: "block", sm: "block" }}
            >
              Swiss Knife
            </Heading>
          </HStack>
        </Link>

        {/* Right side actions */}
        <HStack spacing={4}>
          {/* GitHub link */}
          <ChakraLink
            href="https://github.com/swiss-knife-xyz/swiss-knife"
            isExternal
            display="flex"
            alignItems="center"
          >
            <FontAwesomeIcon icon={faGithub} size={isMobile ? "lg" : "xl"} />
          </ChakraLink>

          {/* Mobile menu button */}
          {isMobile && (
            <IconButton
              aria-label="Open menu"
              icon={<HamburgerIcon />}
              variant="ghost"
              color="white"
              colorScheme="whiteAlpha"
              onClick={onMenuOpen}
              size="md"
            />
          )}
        </HStack>
      </Flex>

      {/* Mobile Menu Drawer */}
      <Drawer isOpen={isMenuOpen} placement="right" onClose={onMenuClose}>
        <DrawerOverlay backdropFilter="blur(5px)" />
        <DrawerContent bg="bg.900" maxW="280px">
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px">🔨 All Tools</DrawerHeader>
          <DrawerBody pt={4}>
            <Accordion allowMultiple defaultIndex={[]} width="100%">
              {Object.keys(subdomains).map((key, index) => {
                const subdomain = subdomains[key];
                const hasPaths = subdomain.paths.length > 0;

                return (
                  <AccordionItem key={index} border="none" mb={2}>
                    {hasPaths ? (
                      <>
                        <AccordionButton
                          p={2}
                          _hover={{ bg: "whiteAlpha.100" }}
                          rounded="md"
                        >
                          <Box
                            as="span"
                            flex="1"
                            textAlign="left"
                            fontSize="sm"
                          >
                            {subdomain.base}
                          </Box>
                          <AccordionIcon />
                        </AccordionButton>
                        <AccordionPanel pb={2} pl={4}>
                          <VStack align="start" spacing={1} width="100%">
                            {subdomain.paths.map((path, pathIndex) => (
                              <Link
                                key={pathIndex}
                                href={`${getPath(subdomain.base)}${path}`}
                                style={{ width: "100%" }}
                                onClick={onMenuClose}
                              >
                                <Box
                                  p={2}
                                  _hover={{ bg: "whiteAlpha.100" }}
                                  rounded="md"
                                  width="100%"
                                  fontSize="xs"
                                >
                                  {path}
                                </Box>
                              </Link>
                            ))}
                          </VStack>
                        </AccordionPanel>
                      </>
                    ) : (
                      <Link
                        href={getPath(subdomain.base)}
                        style={{ width: "100%" }}
                        onClick={onMenuClose}
                      >
                        <Box
                          p={2}
                          _hover={{ bg: "whiteAlpha.100" }}
                          rounded="md"
                          width="100%"
                          fontSize="sm"
                        >
                          {subdomain.base}
                        </Box>
                      </Link>
                    )}
                  </AccordionItem>
                );
              })}
            </Accordion>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </VStack>
  );
};

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
      <NewNavbar />

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
