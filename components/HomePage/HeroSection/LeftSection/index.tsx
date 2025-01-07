import { Flex } from "@chakra-ui/react";
import { Logo } from "./Logo";

export const LeftSection = () => {
  return (
    <Flex
      w={{ base: "100%", md: "33%" }}
      justify="center"
      align="center"
      position="relative"
      zIndex="1"
      mb={{ base: 10, md: 0 }}
    >
      <Logo />
    </Flex>
  );
};
