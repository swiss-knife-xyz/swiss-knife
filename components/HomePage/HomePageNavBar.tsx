"use client";

import { ToolsMenu } from "@/components/ToolsMenu";
import Link from "next/link";
import {
  HStack,
  Flex,
  Link as ChakraLink,
  Image,
  Heading,
} from "@chakra-ui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDiscord,
  faTwitter,
  faGithub,
} from "@fortawesome/free-brands-svg-icons";

export const HomePageNavBar = () => {
  return (
    <Flex
      as="nav"
      align="center"
      justify="space-between"
      wrap="wrap"
      padding={{ base: "1rem", md: "1.5rem" }}
      position="relative"
      zIndex="2"
    >
      <HStack spacing={{ base: 2, md: 4 }}>
        <Link href="/" passHref>
          <HStack spacing={1} cursor="pointer">
            <Image
              src="/logo.svg"
              alt="ETH.sh"
              boxSize={{ base: "3rem", md: "3.5rem" }}
              rounded={"md"}
            />
            <Heading
              fontWeight="bold"
              fontSize={{ base: "2xl", md: "4xl" }}
              color="white"
            >
              ETH.sh
            </Heading>
          </HStack>
        </Link>
      </HStack>

      <HStack spacing={{ base: 4, md: 6 }}>
        <ChakraLink href="/discord" isExternal>
          <FontAwesomeIcon icon={faDiscord} size="lg" color="white" />
        </ChakraLink>
        <ChakraLink href="https://x.com/ethdotsh" isExternal>
          <FontAwesomeIcon icon={faTwitter} size="lg" color="white" />
        </ChakraLink>
        <ChakraLink
          href="https://github.com/swiss-knife-xyz/swiss-knife"
          isExternal
        >
          <FontAwesomeIcon icon={faGithub} size="lg" color="white" />
        </ChakraLink>
        <ToolsMenu />
      </HStack>
    </Flex>
  );
};
