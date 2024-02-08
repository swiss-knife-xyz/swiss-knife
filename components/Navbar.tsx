import Link from "next/link";
import {
  Center,
  Spacer,
  Heading,
  HStack,
  Text,
  Image,
  Flex,
  Link as ChakraLink,
} from "@chakra-ui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { baseURL } from "@/config";

export const Navbar = () => {
  return (
    <Flex>
      <Spacer flex="1" />
      <Center pt={"10"}>
        <Heading color="custom.pale" pl="1rem">
          <Link href={baseURL}>
            <HStack spacing={"4"}>
              <Image w="3rem" alt="icon" src="/icon.png" rounded={"lg"} />
              <Text>Swiss Knife</Text>
            </HStack>
          </Link>
        </Heading>
      </Center>
      <Flex flex="1" justifyContent="flex-end" pr="1rem" pt="1rem">
        <ChakraLink
          href={"https://github.com/swiss-knife-xyz/swiss-knife"}
          isExternal
        >
          <FontAwesomeIcon icon={faGithub} size="2x" />
        </ChakraLink>
      </Flex>
    </Flex>
  );
};
