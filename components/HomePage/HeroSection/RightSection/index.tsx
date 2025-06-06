import { Flex, Heading } from "@chakra-ui/react";
import { SubtitleSection } from "./SubtitleSection";
import { ExploreToolsBtn } from "./ExploreToolsBtn";
import { ViewOnGithubBtn } from "./ViewOnGithubBtn";

export const RightSection = () => {
  return (
    <Flex
      w={{ base: "100%", md: "67%" }}
      direction="column"
      pl={{ base: 0, md: 10 }}
      pr={{ base: 0, md: 10 }}
      position="relative"
      zIndex="1"
      align={{ base: "center", md: "flex-end" }}
      textAlign={{ base: "center", md: "right" }}
    >
      <Heading
        as="h1"
        size={{ base: "2xl", md: "3xl" }}
        color="white"
        lineHeight="1.2"
        mb={{ base: 4, md: 6 }}
        bgGradient="linear(to-r, white, custom.base)"
        bgClip="text"
      >
        All your EVM tools
        <br />
        in one place!
      </Heading>

      <SubtitleSection />

      <Flex
        direction={{ base: "column", sm: "row" }}
        width={{ base: "100%", sm: "auto" }}
        align={{ base: "stretch", sm: "center" }}
        justify={{ base: "center", md: "flex-end" }}
        gap={4}
      >
        <ExploreToolsBtn />
        <ViewOnGithubBtn />
      </Flex>
    </Flex>
  );
};
