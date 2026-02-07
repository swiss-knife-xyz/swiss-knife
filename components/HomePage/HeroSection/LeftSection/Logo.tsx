import { Box, Image } from "@chakra-ui/react";

export const Logo = () => {
  return (
    <Box
      p={2}
      position="relative"
      bg="rgba(232, 65, 66, 0.1)"
      boxShadow="0 0 30px rgba(232, 65, 66, 0.2)"
      borderRadius={{ base: "1rem", sm: "1.25rem", md: "1.5rem" }}
    >
      <Image
        src="/logo.png"
        alt="ETH.sh Logo"
        boxSize={{ base: "11rem", sm: "13.75rem", md: "15rem" }}
        objectFit="contain"
        borderRadius={{ base: "0.75rem", sm: "1rem", md: "1.25rem" }}
      />
    </Box>
  );
};
