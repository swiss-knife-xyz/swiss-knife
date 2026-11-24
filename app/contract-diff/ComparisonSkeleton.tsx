"use client";

import {
  Box,
  Grid,
  HStack,
  Skeleton,
  VStack,
  VisuallyHidden,
} from "@chakra-ui/react";

const lineWidths = [42, 68, 54, 80, 62, 36, 74, 58, 86, 46, 64, 32];

export function ComparisonSkeleton() {
  const placeholder = {
    startColor: "whiteAlpha.50",
    endColor: "whiteAlpha.200",
    speed: 1.4,
    borderRadius: "sm",
  };
  return (
    <Box
      mt={6}
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="lg"
      overflow="hidden"
      role="status"
      aria-label="Loading comparison"
      aria-busy="true"
      sx={{ "@media (prefers-reduced-motion: reduce)": { "*, *::before, *::after": { animation: "none !important" } } }}
    >
      <VisuallyHidden>Loading contract sources for comparison.</VisuallyHidden>
      <Box aria-hidden="true">
        <HStack
          px={3}
          py={3}
          spacing={3}
          bg="whiteAlpha.50"
          borderBottom="1px solid"
          borderColor="whiteAlpha.100"
        >
          <Skeleton {...placeholder} h={3} w={28} />
          <Skeleton {...placeholder} h={3} w={9} />
          <Skeleton {...placeholder} h={3} w={9} />
          <Box flex={1} />
          <Skeleton {...placeholder} boxSize={4} />
        </HStack>
        <Grid
          templateColumns={{ base: "1fr", md: "180px 1fr" }}
          h="560px"
          maxH="calc(100dvh - 96px)"
          minH="280px"
          bg="bg.subtle"
        >
          <VStack
            display={{ base: "none", md: "flex" }}
            align="stretch"
            spacing={5}
            p={4}
            borderRight="1px solid"
            borderColor="whiteAlpha.100"
          >
            <Skeleton {...placeholder} h={2} w="60%" mb={2} />
            {[75, 90, 65, 82, 70, 88].map((width, index) => (
              <HStack key={index} spacing={2} pl={index % 3 ? 3 : 0}>
                <Skeleton {...placeholder} boxSize={3} flexShrink={0} />
                <Skeleton {...placeholder} h={2} w={`${width}%`} />
              </HStack>
            ))}
          </VStack>
          <Box minW={0} overflow="hidden">
            <HStack
              px={3}
              h={10}
              spacing={5}
              borderBottom="1px solid"
              borderColor="whiteAlpha.100"
              bg="whiteAlpha.50"
            >
              {[24, 20, 28].map((width) => (
                <Skeleton key={width} {...placeholder} h={3} w={width} />
              ))}
            </HStack>
            <HStack
              px={3}
              h={11}
              spacing={3}
              borderBottom="1px solid"
              borderColor="whiteAlpha.100"
            >
              <Skeleton {...placeholder} h={5} w={32} borderRadius="full" />
              <Skeleton {...placeholder} h={5} w={24} borderRadius="full" />
            </HStack>
            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }}>
              {[0, 1].map((side) => (
                <VStack
                  key={side}
                  display={{ base: side ? "none" : "flex", md: "flex" }}
                  align="stretch"
                  spacing={4}
                  p={4}
                  borderLeft={side ? "1px solid" : undefined}
                  borderColor="whiteAlpha.100"
                >
                  {lineWidths.map((width, index) => (
                    <HStack key={index} spacing={4}>
                      <Skeleton {...placeholder} h={2} w={3} flexShrink={0} />
                      <Skeleton
                        {...placeholder}
                        h={2}
                        w={`${width}%`}
                        ml={index % 4 ? 3 : 0}
                      />
                    </HStack>
                  ))}
                </VStack>
              ))}
            </Grid>
          </Box>
        </Grid>
      </Box>
    </Box>
  );
}
