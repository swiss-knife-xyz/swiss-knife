import { Link as ChakraLink, Button, HStack, Text } from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";

export const ViewOnGithubBtn = () => {
  return (
    <ChakraLink
      href="https://github.com/swiss-knife-xyz/swiss-knife"
      isExternal
      width={{ base: "100%", sm: "auto" }}
    >
      <Button
        size={{ base: "md", md: "lg" }}
        bg="transparent"
        color="white"
        borderWidth={2}
        borderColor="whiteAlpha.300"
        _hover={{ bg: "whiteAlpha.100", borderColor: "whiteAlpha.500" }}
        borderRadius="full"
        px={{ base: 6, md: 8 }}
        width="100%"
      >
        <HStack>
          <Text>View on GitHub</Text>
          <ExternalLinkIcon />
        </HStack>
      </Button>
    </ChakraLink>
  );
};
