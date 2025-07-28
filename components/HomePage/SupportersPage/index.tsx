import { Box, VStack } from "@chakra-ui/react";
import { SupporterSection } from "./SupportersSection";
import { ContributorsLeaderboard } from "./ContributorsLeaderboard";

export const SupportersPage = () => {
  return (
    <Box as="main" py={8} px={{ base: 4, md: 8 }}>
      <VStack spacing={16} align="stretch">
        <SupporterSection />        
        <ContributorsLeaderboard />
      </VStack>
    </Box>
  );
};