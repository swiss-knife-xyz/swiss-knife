import Link from "next/link";
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
import { Menu, Github } from "lucide-react";
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
        px={{ base: 4, md: 6 }}
        alignItems="center"
        justifyContent="space-between"
        borderBottom="1px solid"
        borderColor="border.subtle"
        bg="bg.base"
      >
        {/* Logo */}
        <Link href={baseURL}>
          <HStack spacing={{ base: "2", sm: "3" }}>
            <Image
              w={{ base: "2rem", sm: "2.5rem" }}
              h={{ base: "2rem", sm: "2.5rem" }}
              alt="icon"
              src="/icon.png"
              rounded="md"
            />
            <Heading
              color="text.primary"
              fontSize={{ base: "lg", sm: "xl", md: "2xl" }}
              fontWeight="semibold"
              letterSpacing="-0.02em"
            >
              ETH.sh
            </Heading>
          </HStack>
        </Link>

        {/* Right side actions */}
        <HStack spacing={3}>
          {/* GitHub link */}
          <ChakraLink
            href="https://github.com/swiss-knife-xyz/swiss-knife"
            isExternal
            display="flex"
            alignItems="center"
            color="text.secondary"
            _hover={{ color: "text.primary" }}
            transition="color 0.2s"
          >
            <Github size={isMobile ? 20 : 22} />
          </ChakraLink>

          <IconButton
            aria-label="Open menu"
            icon={<Menu size={20} />}
            variant="ghost"
            color="text.secondary"
            _hover={{ color: "text.primary", bg: "bg.emphasis" }}
            onClick={onMenuOpen}
            size="md"
          />
        </HStack>
      </Flex>

      {/* Notification Bar */}
      <NotificationBar />

      {/* Mobile Menu Drawer */}
      <Drawer isOpen={isMenuOpen} placement="right" onClose={onMenuClose}>
        <DrawerOverlay backdropFilter="blur(8px)" bg="blackAlpha.600" />
        <DrawerContent bg="bg.base" maxW="300px">
          <DrawerCloseButton color="text.secondary" _hover={{ color: "text.primary" }} />
          <DrawerHeader
            borderBottomWidth="1px"
            borderColor="border.subtle"
            color="text.primary"
            fontWeight="semibold"
          >
            All Tools
          </DrawerHeader>
          <DrawerBody pt={4} px={3}>
            <Accordion allowMultiple defaultIndex={[]} width="100%">
              {Object.keys(subdomains).map((key, index) => {
                const subdomain = subdomains[key];
                const hasPaths = subdomain.paths.length > 0;

                return (
                  <AccordionItem key={index} border="none" mb={1}>
                    {hasPaths ? (
                      <>
                        <AccordionButton
                          p={3}
                          _hover={{ bg: "bg.emphasis" }}
                          rounded="lg"
                          color="text.primary"
                        >
                          <Box
                            as="span"
                            flex="1"
                            textAlign="left"
                            fontSize="sm"
                            fontWeight="medium"
                          >
                            {subdomain.base}
                          </Box>
                          <AccordionIcon color="text.secondary" />
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
                                  pl={3}
                                  _hover={{ bg: "bg.emphasis" }}
                                  rounded="md"
                                  width="100%"
                                  fontSize="sm"
                                  color="text.secondary"
                                  transition="all 0.2s"
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
                          p={3}
                          _hover={{ bg: "bg.emphasis" }}
                          rounded="lg"
                          width="100%"
                          fontSize="sm"
                          fontWeight="medium"
                          color="text.primary"
                          transition="all 0.2s"
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
