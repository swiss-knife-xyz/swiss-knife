import { Box } from "@chakra-ui/react";

export const RightDash = () => {
  return (
    <Box
      height="2px"
      width={{ base: "5%", sm: "10%", md: "15%" }}
      bgGradient="linear(to-l, transparent, custom.base)"
      ml={{ base: 3, md: 6 }}
    />
  );
};
