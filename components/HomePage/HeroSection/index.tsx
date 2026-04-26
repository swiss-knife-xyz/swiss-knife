import { Container, Flex } from "@chakra-ui/react";
import { BackgroundBlur } from "./BackgroundBlur";
import { LeftSection } from "./LeftSection";
import { RightSection } from "./RightSection";

export const HeroSection = () => {
  return (
    <Container
      maxW={{ base: "90%", md: "80%", lg: "70%" }}
      pt={{ base: 6, md: 10 }}
      pb={{ base: 12, md: 20 }}
    >
      <Flex
        direction={{ base: "column", md: "row" }}
        align="center"
        justify="space-between"
        position="relative"
      >
        <BackgroundBlur />

        {/* Left side with logo */}
        <LeftSection />

        {/* Right side with text and buttons */}
        <RightSection />
      </Flex>
    </Container>
  );
};
