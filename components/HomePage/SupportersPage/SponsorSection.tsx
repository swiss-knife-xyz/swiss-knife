import { Box, Flex, Heading, Image, VStack, Text, SimpleGrid } from "@chakra-ui/react";
import { LeftDash } from "../ToolsGrid/ToolsGridHeading/LeftDash";
import { RightDash } from "../ToolsGrid/ToolsGridHeading/RightDash";

type Sponsor = {
  name: string;
  logo: string;
  category: string;
};

const sponsors: Sponsor[] = [
  { name: "Paradigm", logo: "/logos/paradigm.png", category: "Collaborators" },
  { name: "Ithaca", logo: "/logos/ithaca.png", category: "Collaborators" },
  { name: "Stripe", logo: "/logos/stripe.png", category: "Large Enterprises" },
  { name: "Zksync", logo: "/logos/zksync.png", category: "Large Enterprises" },
  { name: "Linea", logo: "/logos/linea.png", category: "Small Enterprises" },
  { name: "Routescan", logo: "/logos/routescan.png", category: "Small Enterprises" },
];

const SponsorCard = ({ name, logo }: { name: string; logo: string }) => {
  return (
    <Box
      p={4}
      bg="whiteAlpha.50"
      borderRadius="lg"
      border="1px solid"
      borderColor="whiteAlpha.200"
      boxShadow="md"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height="120px"
      _hover={{
        bg: "whiteAlpha.100",
        transform: "translateY(-2px)",
        boxShadow: "lg",
        transition: "all 0.2s",
      }}
      transition="all 0.2s"
    >
      <Image 
        src={logo} 
        alt={name} 
        maxW={{ base: "80px", md: "100px" }}
        maxH={{ base: "80px", md: "100px" }}
        objectFit="contain"
        filter="brightness(0) invert(1)"
      />
    </Box>
  );
};

const SponsorCategory = ({ category, sponsors }: { category: string; sponsors: Sponsor[] }) => {
  return (
    <VStack spacing={4} align="start" w="full">
      <Text fontSize="lg" fontWeight="bold" color="whiteAlpha.800">
        {category}
      </Text>
      <SimpleGrid columns={{ base: 2, sm: 3, md: sponsors.length > 3 ? 4 : sponsors.length }} spacing={4} w="full">
        {sponsors.map((s, i) => (
          <SponsorCard key={`${category}-${i}`} name={s.name} logo={s.logo} />
        ))}
      </SimpleGrid>
    </VStack>
  );
};

export const SponsorSection = () => {
  const collaborators = sponsors.filter(s => s.category === "Collaborators");
  const largeEnterprises = sponsors.filter(s => s.category === "Large Enterprises");
  const smallEnterprises = sponsors.filter(s => s.category === "Small Enterprises");

  return (
    <Box w="full" mt={{ base: 12, md: 16 }} mb={{ base: 12, md: 16 }}>
      <Flex alignItems="center" justifyContent="center" width="100%" mb={{ base: 6, md: 12 }}>
        <LeftDash />
        <Heading
          as="h2"
          size={{ base: "lg", md: "xl" }}
          color="white"
          textAlign="center"
          bgGradient="linear(to-r, white, custom.base)"
          bgClip="text"
        >
          Sponsored by
        </Heading>
        <RightDash />
      </Flex>

      <VStack spacing={12} px={{ base: 4, md: 8 }}>
        {collaborators.length > 0 && (
          <SponsorCategory category="Collaborators" sponsors={collaborators} />
        )}
        {largeEnterprises.length > 0 && (
          <SponsorCategory category="Large Enterprises" sponsors={largeEnterprises} />
        )}
        {smallEnterprises.length > 0 && (
          <SponsorCategory category="Small Enterprises" sponsors={smallEnterprises} />
        )}
      </VStack>
    </Box>
  );
};