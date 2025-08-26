import { Box, Flex, Heading, Image, VStack, SimpleGrid, Text, Link } from "@chakra-ui/react";
import { LeftDash } from "../ToolsGrid/ToolsGridHeading/LeftDash";
import { RightDash } from "../ToolsGrid/ToolsGridHeading/RightDash";
import supporter from "./data/supporters.json";

type Supporter = {
  name: string;
  logo: string;
  website?: string; // Add website field to your JSON data
};

const supporters: Supporter[] = supporter;

const SupporterCard = ({ name, logo, website }: Supporter) => {
  return (
    <Link 
      href={website || '#'} 
      isExternal
      _hover={{ textDecoration: "none" }}
      w="full"
    >
      <VStack
        p={4}
        bg="whiteAlpha.50"
        borderRadius="lg"
        border="1px solid"
        borderColor="whiteAlpha.200"
        boxShadow="md"
        height="140px"
        spacing={3}
        _hover={{
          bg: "whiteAlpha.100",
          transform: "translateY(-5px)",
          boxShadow: "xl",
          borderColor: "custom.base",
          cursor: "pointer",
        }}
        transition="all 0.2s"
      >
        <Image 
          src={logo} 
          alt={name} 
          maxW={{ base: "80px", md: "100px" }}
          maxH={{ base: "50px", md: "60px" }}
          objectFit="contain"
        />
        <Text 
          fontSize={{ base: "sm", md: "md" }}
          color="whiteAlpha.800"
          textAlign="center"
          fontWeight="medium"
        >
          {name}
        </Text>
      </VStack>
    </Link>
  );
};

export const SupporterSection = () => {
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
          Supported by
        </Heading>
        <RightDash />
      </Flex>

      <VStack spacing={12} px={{ base: 4, md: 8 }}>
        <SimpleGrid 
          columns={{ 
            base: 2, 
            sm: 3, 
            md: supporters.length > 3 ? 4 : supporters.length 
          }} 
          spacing={6}
          w="full"
          maxW="1200px"
          mx="auto"
        >
          {supporters.map((s, i) => (
            <SupporterCard key={`${s.name}-${i}`} {...s} />
          ))}
        </SimpleGrid>
      </VStack>
    </Box>
  );
};