import Link from "next/link";
import { Box, Heading, Flex, Text } from "@chakra-ui/react";
import { getPath } from "@/utils";

interface ToolsGridItemParams {
  subdomain: string;
  info: {
    emoji: string;
    label: string;
    description: string;
  };
}

export const ToolsGridItem = ({ subdomain, info }: ToolsGridItemParams) => {
  return (
    <Link href={getPath(subdomain)} passHref role="group">
      <Box
        p={{ base: 4, md: 6 }}
        bg="bg.700"
        borderRadius="xl"
        boxShadow="lg"
        transition="all 0.3s"
        borderWidth="1px"
        borderColor="whiteAlpha.300"
        _hover={{
          transform: "translateY(-5px)",
          boxShadow: "xl",
          borderColor: "custom.base",
        }}
        height="100%"
        cursor="pointer"
        position="relative"
        overflow="hidden"
      >
        <Box
          position="absolute"
          top="-30px"
          right="-30px"
          width="120px"
          height="120px"
          bgGradient="linear(to-br, rgba(232, 65, 66, 0.3), rgba(255, 138, 139, 0.1))"
          borderRadius="full"
          zIndex="0"
          filter="blur(15px)"
        />
        <Box position="relative" zIndex="1">
          <Heading as="h3" size="md" color="white" mb={3}>
            <Flex align="center">
              <Text fontSize="xl" mr={2}>
                {info.emoji}
              </Text>
              {info.label}
            </Flex>
          </Heading>
          <Text color="gray.300" fontSize={{ base: "sm", md: "md" }}>
            {info.description}
          </Text>
        </Box>
      </Box>
    </Link>
  );
};
