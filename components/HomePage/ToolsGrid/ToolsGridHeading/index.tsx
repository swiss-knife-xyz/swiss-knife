import { Flex, Heading } from "@chakra-ui/react";
import { LeftDash } from "./LeftDash";
import { RightDash } from "./RightDash";

export const ToolsGridHeading = () => {
  return (
    <Flex
      alignItems="center"
      justifyContent="center"
      width="100%"
      mb={{ base: 8, md: 12 }}
    >
      <LeftDash />
      <Heading
        as="h2"
        size={{ base: "lg", md: "xl" }}
        color="white"
        textAlign="center"
        bgGradient="linear(to-r, white, custom.base)"
        bgClip="text"
      >
        Explore Our Tools
      </Heading>
      <RightDash />
    </Flex>
  );
};
