import Link from "next/link";
import { Center, Heading, HStack, Text, Image } from "@chakra-ui/react";
import { baseURL } from "@/config";

export const Navbar = () => {
  return (
    <Center pt={"10"}>
      <Heading color="custom.pale">
        <Link href={baseURL}>
          <HStack spacing={"4"}>
            <Image w="3rem" alt="icon" src="/icon.png" rounded={"lg"} />
            <Text>Swiss Knife</Text>
          </HStack>
        </Link>
      </Heading>
    </Center>
  );
};
