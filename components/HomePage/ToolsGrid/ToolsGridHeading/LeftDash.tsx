import { Box } from "@chakra-ui/react";

export const LeftDash = () => {
  return (
    <Box
      height="2px"
      width={{ base: "5%", sm: "10%", md: "15%" }}
      bgGradient="linear(to-r, transparent, custom.base)"
      mr={{ base: 3, md: 6 }}
    />
  );
};
