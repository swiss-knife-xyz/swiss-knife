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
          <HStack spacing={{ base: 2, md: 4 }} cursor="pointer">
            <Image
              src="/icon.png"
              alt="Swiss Knife"
              boxSize={{ base: "2.5rem", md: "3rem" }}
              rounded={"md"}
            />
            <Heading
              fontWeight="bold"
              fontSize={{ base: "2xl", md: "4xl" }}
              color="white"
            >
              Swiss Knife
            </Heading>
          </HStack>
        </Link>
      </HStack>

      <HStack spacing={{ base: 4, md: 6 }}>
        <ChakraLink href="/discord" isExternal>
          <FontAwesomeIcon icon={faDiscord} size="lg" />
        </ChakraLink>
        <ChakraLink href="https://twitter.com/swissknifexyz" isExternal>
          <FontAwesomeIcon icon={faTwitter} size="lg" />
        </ChakraLink>
        <ChakraLink
          href="https://github.com/swiss-knife-xyz/swiss-knife"
          isExternal
        >
          <FontAwesomeIcon icon={faGithub} size="lg" />
        </ChakraLink>
      </HStack>
    </Flex>
  );
};
