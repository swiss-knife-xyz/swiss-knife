import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Box,
  Flex,
  HStack,
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
import { baseURL } from "@/config";
import subdomains from "@/subdomains";
import { getPath } from "@/utils";
import { NotificationBar } from "./NotificationBar";

export const Navbar = () => {
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
              ETH.sh
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

          <IconButton
            aria-label="Open menu"
            icon={<HamburgerIcon />}
            variant="ghost"
            color="white"
            colorScheme="whiteAlpha"
            onClick={onMenuOpen}
            size="md"
          />
        </HStack>
      </Flex>

      {/* Notification Bar */}
      <NotificationBar />

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
                                href={`${getPath(
                                  subdomain.base,
                                  subdomain.isRelativePath
                                )}${path}`}
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
                        href={getPath(subdomain.base, subdomain.isRelativePath)}
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
