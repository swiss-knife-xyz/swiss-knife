import { Button } from "@chakra-ui/react";

export const ExploreToolsBtn = () => {
  return (
    <Button
      size={{ base: "md", md: "lg" }}
      bg="custom.base"
      color="white"
      _hover={{ bg: "red.600" }}
      borderRadius="full"
      px={{ base: 6, md: 8 }}
      boxShadow="none"
      as="a"
      href="#all-tools"
      width={{ base: "100%", sm: "auto" }}
    >
      Explore Tools
    </Button>
  );
};
