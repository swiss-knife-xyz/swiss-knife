import {
  Box,
  Container,
  Text,
  Link as ChakraLink,
  HStack,
  Heading,
  Flex,
  SimpleGrid,
  Button,
  Image,
} from "@chakra-ui/react";
import { ExternalLink, MessageCircle } from "lucide-react";
import { getPath } from "@/utils";
import subdomains from "@/subdomains";

export const Footer = () => {
  return (
    <Box
      mt={10}
      bg="bg.base"
      py={{ base: 10, md: 12 }}
      borderTop="1px"
      borderColor="border.subtle"
    >
      <Container maxW="container.xl" px={{ base: 4, md: 6 }}>
        <Flex
          direction={{ base: "column", md: "row" }}
          justify="space-between"
          align={{ base: "center", md: "flex-start" }}
          gap={{ base: 8, md: 10 }}
        >
          {/* Logo and Description */}
          <Flex
            direction="column"
            maxW={{ base: "100%", md: "30%" }}
            mb={{ base: 6, md: 0 }}
            align={{ base: "center", md: "flex-start" }}
            textAlign={{ base: "center", md: "left" }}
          >
            <HStack spacing={3} mb={4}>
              <Image
                src="/icon.png"
                alt="ETH.sh"
                boxSize="2.5rem"
                rounded="md"
              />
              <Heading fontWeight="semibold" fontSize="2xl" color="text.primary">
                ETH.sh
              </Heading>
            </HStack>
            <Text color="text.secondary" fontSize="sm" lineHeight="tall">
              ETH.sh is a comprehensive suite of tools for Ethereum developers
              and users, designed to simplify blockchain interactions & making
              the EVM human-friendly.
            </Text>
          </Flex>

          {/* Quick Links, Popular Tools, and Newsletter in a grid */}
          <SimpleGrid
            columns={{ base: 1, sm: 3 }}
            spacing={{ base: 6, md: 10 }}
            width={{ base: "100%", md: "auto" }}
          >
            {/* Quick Links */}
            <Box>
              <Heading
                as="h4"
                size="sm"
                color="text.primary"
                mb={4}
                fontWeight="semibold"
                textAlign={{ base: "center", sm: "left" }}
              >
                Quick Links
              </Heading>
              <Flex
                direction="column"
                gap={2}
                align={{ base: "center", sm: "flex-start" }}
              >
                <ChakraLink
                  href="#all-tools"
                  color="text.secondary"
                  fontSize="sm"
                  _hover={{ color: "primary.400" }}
                  transition="color 0.2s"
                >
                  All Tools
                </ChakraLink>
                <ChakraLink
                  href="https://github.com/swiss-knife-xyz/swiss-knife"
                  isExternal
                  color="text.secondary"
                  fontSize="sm"
                  _hover={{ color: "primary.400" }}
                  transition="color 0.2s"
                  display="flex"
                  alignItems="center"
                  gap={1}
                >
                  GitHub <ExternalLink size={12} />
                </ChakraLink>
                <ChakraLink
                  href="/discord"
                  isExternal
                  color="text.secondary"
                  fontSize="sm"
                  _hover={{ color: "primary.400" }}
                  transition="color 0.2s"
                  display="flex"
                  alignItems="center"
                  gap={1}
                >
                  Discord <ExternalLink size={12} />
                </ChakraLink>
                <ChakraLink
                  href="https://twitter.com/swissknifexyz"
                  isExternal
                  color="text.secondary"
                  fontSize="sm"
                  _hover={{ color: "primary.400" }}
                  transition="color 0.2s"
                  display="flex"
                  alignItems="center"
                  gap={1}
                >
                  Twitter <ExternalLink size={12} />
                </ChakraLink>
              </Flex>
            </Box>

            {/* Popular Tools */}
            <Box>
              <Heading
                as="h4"
                size="sm"
                color="text.primary"
                mb={4}
                fontWeight="semibold"
                textAlign={{ base: "center", sm: "left" }}
              >
                Popular Tools
              </Heading>
              <Flex
                direction="column"
                gap={2}
                align={{ base: "center", sm: "flex-start" }}
              >
                <ChakraLink
                  href={`${getPath(subdomains.CALLDATA.base)}decoder`}
                  color="text.secondary"
                  fontSize="sm"
                  _hover={{ color: "primary.400" }}
                  transition="color 0.2s"
                >
                  Calldata Decoder
                </ChakraLink>
                <ChakraLink
                  href={`${getPath(subdomains.CONVERTER.base)}`}
                  color="text.secondary"
                  fontSize="sm"
                  _hover={{ color: "primary.400" }}
                  transition="color 0.2s"
                >
                  Unit Converter
                </ChakraLink>
                <ChakraLink
                  href={`${getPath(subdomains.EXPLORER.base)}`}
                  color="text.secondary"
                  fontSize="sm"
                  _hover={{ color: "primary.400" }}
                  transition="color 0.2s"
                >
                  Blockchain Explorer
                </ChakraLink>
                <ChakraLink
                  href={`${getPath(subdomains.TRANSACT.base)}`}
                  color="text.secondary"
                  fontSize="sm"
                  _hover={{ color: "primary.400" }}
                  transition="color 0.2s"
                >
                  Transaction Tools
                </ChakraLink>
              </Flex>
            </Box>

            {/* Community */}
            <Box>
              <Heading
                as="h4"
                size="sm"
                color="text.primary"
                mb={4}
                fontWeight="semibold"
                textAlign={{ base: "center", sm: "left" }}
              >
                Stay Updated
              </Heading>
              <Text
                color="text.secondary"
                fontSize="sm"
                mb={4}
                textAlign={{ base: "center", sm: "left" }}
              >
                Join our community to get the latest updates and announcements.
              </Text>
              <Flex justify={{ base: "center", sm: "flex-start" }}>
                <Button
                  size="md"
                  bg="custom.base"
                  color="white"
                  _hover={{ bg: "red.600" }}
                  leftIcon={<MessageCircle size={18} />}
                  as="a"
                  href="/discord"
                  borderRadius="lg"
                  fontWeight="medium"
                >
                  Join Discord
                </Button>
              </Flex>
            </Box>
          </SimpleGrid>
        </Flex>
      </Container>
    </Box>
  );
};
