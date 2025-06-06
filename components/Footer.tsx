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
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDiscord } from "@fortawesome/free-brands-svg-icons";
import { getPath } from "@/utils";
import subdomains from "@/subdomains";

export const Footer = () => {
  return (
    <Box
      mt={10}
      bg="bg.900"
      py={{ base: 8, md: 10 }}
      borderTop="1px"
      borderColor="whiteAlpha.200"
    >
      <Container maxW="container.xl" px={{ base: 4, md: 6 }}>
        <Flex
          direction={{ base: "column", md: "row" }}
          justify="space-between"
          align={{ base: "center", md: "flex-start" }}
          gap={{ base: 6, md: 8 }}
        >
          {/* Logo and Description */}
          <Flex
            direction="column"
            maxW={{ base: "100%", md: "30%" }}
            mb={{ base: 6, md: 0 }}
            align={{ base: "center", md: "flex-start" }}
            textAlign={{ base: "center", md: "left" }}
          >
            <HStack spacing={4} mb={4}>
              <Image
                src="/icon.png"
                alt="Swiss Knife"
                boxSize="2.5rem"
                rounded={"md"}
              />
              <Heading fontWeight="bold" fontSize="2xl" color="white">
                Swiss-Knife.xyz
              </Heading>
            </HStack>
            <Text color="gray.400" fontSize="sm">
              Swiss-Knife.xyz is a comprehensive suite of tools for Ethereum
              developers and users, designed to simplify blockchain interactions
              & making the EVM human-friendly.
            </Text>
          </Flex>

          {/* Quick Links, Popular Tools, and Newsletter in a grid for mobile */}
          <SimpleGrid
            columns={{ base: 1, sm: 3 }}
            spacing={8}
            width={{ base: "100%", md: "auto" }}
          >
            {/* Quick Links */}
            <Box>
              <Heading
                as="h4"
                size="sm"
                color="white"
                mb={4}
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
                  color="gray.400"
                  _hover={{ color: "custom.base" }}
                >
                  All Tools
                </ChakraLink>
                <ChakraLink
                  href="https://github.com/swiss-knife-xyz/swiss-knife"
                  isExternal
                  color="gray.400"
                  _hover={{ color: "custom.base" }}
                >
                  GitHub <ExternalLinkIcon mx="2px" />
                </ChakraLink>
                <ChakraLink
                  href="/discord"
                  isExternal
                  color="gray.400"
                  _hover={{ color: "custom.base" }}
                >
                  Discord <ExternalLinkIcon mx="2px" />
                </ChakraLink>
                <ChakraLink
                  href="https://twitter.com/swissknifexyz"
                  isExternal
                  color="gray.400"
                  _hover={{ color: "custom.base" }}
                >
                  Twitter <ExternalLinkIcon mx="2px" />
                </ChakraLink>
              </Flex>
            </Box>

            {/* Popular Tools */}
            <Box>
              <Heading
                as="h4"
                size="sm"
                color="white"
                mb={4}
                textAlign={{ base: "center", sm: "left" }}
              >
                🏆 Popular Tools
              </Heading>
              <Flex
                direction="column"
                gap={2}
                align={{ base: "center", sm: "flex-start" }}
              >
                <ChakraLink
                  href={`${getPath(subdomains.CALLDATA.base)}decoder`}
                  color="gray.400"
                  _hover={{ color: "custom.base" }}
                >
                  Calldata Decoder
                </ChakraLink>
                <ChakraLink
                  href={`${getPath(subdomains.CONVERTER.base)}`}
                  color="gray.400"
                  _hover={{ color: "custom.base" }}
                >
                  Unit Converter
                </ChakraLink>
                <ChakraLink
                  href={`${getPath(subdomains.EXPLORER.base)}`}
                  color="gray.400"
                  _hover={{ color: "custom.base" }}
                >
                  Blockchain Explorer
                </ChakraLink>
                <ChakraLink
                  href={`${getPath(subdomains.TRANSACT.base)}`}
                  color="gray.400"
                  _hover={{ color: "custom.base" }}
                >
                  Transaction Tools
                </ChakraLink>
              </Flex>
            </Box>

            {/* Newsletter Signup */}
            <Box>
              <Heading
                as="h4"
                size="sm"
                color="white"
                mb={4}
                textAlign={{ base: "center", sm: "left" }}
              >
                Stay Updated
              </Heading>
              <Text
                color="gray.400"
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
                  borderRadius="md"
                  leftIcon={<FontAwesomeIcon icon={faDiscord} size="lg" />}
                  as="a"
                  href="/discord"
                >
                  Join Discord
                </Button>
              </Flex>
            </Box>
          </SimpleGrid>
        </Flex>

        {/* Copyright */}
        {/* <Flex
            direction={{ base: "column", md: "row" }}
            justify="space-between"
            align="center"
            mt={{ base: 8, md: 12 }}
            pt={{ base: 4, md: 6 }}
            borderTop="1px"
            borderColor="whiteAlpha.200"
          >
            <Text color="gray.500" fontSize="sm" textAlign="center">
              © {new Date().getFullYear()} Swiss Knife. All rights reserved.
            </Text>
            <HStack spacing={{ base: 4, md: 6 }} mt={{ base: 4, md: 0 }}>
              <ChakraLink
                href="/discord"
                isExternal
                color="gray.400"
                _hover={{ color: "white" }}
              >
                <FontAwesomeIcon icon={faDiscord} size="lg" />
              </ChakraLink>
              <ChakraLink
                href="https://twitter.com/swissknifexyz"
                isExternal
                color="gray.400"
                _hover={{ color: "white" }}
              >
                <FontAwesomeIcon icon={faTwitter} size="lg" />
              </ChakraLink>
              <ChakraLink
                href="https://github.com/swiss-knife-xyz/swiss-knife"
                isExternal
                color="gray.400"
                _hover={{ color: "white" }}
              >
                <FontAwesomeIcon icon={faGithub} size="lg" />
              </ChakraLink>
            </HStack>
          </Flex> */}
      </Container>
    </Box>
  );
};
