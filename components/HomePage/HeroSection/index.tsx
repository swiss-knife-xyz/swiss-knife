import { Container, Flex } from "@chakra-ui/react";
import { LeftSection } from "./LeftSection";
import { RightSection } from "./RightSection";
import { Omnibox } from "./Omnibox";

export const HeroSection = () => {
  return (
    <Container
      maxW={{ base: "90%", md: "80%", lg: "70%" }}
      pt={{ base: 6, md: 10 }}
      pb={{ base: 6, md: 8 }}
    >
      <Flex
        direction={{ base: "column", md: "row" }}
        align="center"
        justify="space-between"
        position="relative"
      >
        {/* Left side with logo */}
        <LeftSection />

        {/* Right side with text and buttons */}
        <RightSection />
      </Flex>
      <Omnibox />
    </Container>
  );
};
