"use client";

import { Box, HStack, Skeleton, Text, VStack } from "@chakra-ui/react";

const decodedSkeletonProps = {
  startColor: "#202020",
  endColor: "#2b2b2b",
  speed: 1.6,
  borderRadius: "md",
};

export function DecodedCalldataSkeleton() {
  return (
    <Box position="relative" role="status" aria-live="polite">
      <Box aria-hidden="true" filter="blur(2px)" opacity={0.45} pointerEvents="none">
        <HStack mb={3} justify="flex-end">
          <Skeleton {...decodedSkeletonProps} h={4} w="100px" />
        </HStack>
        <Box
          p={4}
          bg="whiteAlpha.50"
          borderRadius="lg"
          border="1px solid"
          borderColor="whiteAlpha.200"
        >
          <HStack spacing={3} mb={6}>
            <Skeleton {...decodedSkeletonProps} h={5} w="35%" maxW="220px" />
            <Skeleton {...decodedSkeletonProps} h={3} w="64px" />
          </HStack>
          <VStack
            align="stretch"
            spacing={5}
            ml={{ base: 2, md: 4 }}
            pl={4}
            borderLeft="1px solid"
            borderColor="whiteAlpha.100"
          >
            {["75%", "50%", "85%"].map((width) => (
              <Box key={width}>
                <Skeleton {...decodedSkeletonProps} h={3} w="80px" mb={3} />
                <Skeleton {...decodedSkeletonProps} h={8} w={width} />
              </Box>
            ))}
            <Box
              pl={4}
              borderLeft="1px solid"
              borderColor="whiteAlpha.100"
            >
              <Skeleton {...decodedSkeletonProps} h={4} w="35%" mb={4} />
              <Skeleton {...decodedSkeletonProps} h={3} w="64px" mb={3} />
              <Skeleton {...decodedSkeletonProps} h={8} w="70%" />
            </Box>
          </VStack>
        </Box>
      </Box>
      <HStack
        position="absolute"
        inset={0}
        justify="center"
        align="center"
        spacing={3}
        px={3}
        borderRadius="lg"
        bg="blackAlpha.300"
      >
        <HStack spacing={1.5} aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <Box
              key={index}
              boxSize="6px"
              borderRadius="full"
              bg="gray.300"
              sx={{
                animation: "decode-dot-pulse 1.2s ease-in-out infinite",
                animationDelay: `${index * 0.16}s`,
                "@keyframes decode-dot-pulse": {
                  "0%, 80%, 100%": { opacity: 0.35, transform: "translateY(0)" },
                  "40%": { opacity: 1, transform: "translateY(-4px)" },
                },
                "@media (prefers-reduced-motion: reduce)": {
                  animation: "none",
                },
              }}
            />
          ))}
        </HStack>
        <Text
          color="gray.100"
          fontSize="sm"
          fontWeight="medium"
          textShadow="0 2px 12px rgba(0, 0, 0, 0.8)"
        >
          Decoding Calldata...
        </Text>
      </HStack>
    </Box>
  );
}

