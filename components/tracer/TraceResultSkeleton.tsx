"use client";

import {
  Box,
  Flex,
  HStack,
  Skeleton,
  VisuallyHidden,
  type SkeletonProps,
} from "@chakra-ui/react";

function Bone(props: SkeletonProps) {
  return (
    <Skeleton
      startColor="bg.emphasis"
      endColor="whiteAlpha.200"
      speed={1.6}
      borderRadius="sm"
      {...props}
    />
  );
}

export function TraceResultSkeleton() {
  return (
    <Box
      role="status"
      aria-label="Tracing transaction"
      aria-live="polite"
      aria-busy="true"
      sx={{
        "@media (prefers-reduced-motion: reduce)": {
          "& *": { animation: "none !important" },
        },
      }}
    >
      <VisuallyHidden>Tracing transaction…</VisuallyHidden>
      <Box aria-hidden="true" pointerEvents="none">
        <Flex justify="space-between" align="center" gap={3} mb={3}>
          <Box flex="1" minW={0}>
            <Bone h={3} w="96px" mb={2} />
            <Bone h={2} w="70%" maxW="420px" />
          </Box>
          <Bone h={8} w="110px" />
        </Flex>
        <Box
          display="grid"
          gridTemplateColumns={{
            base: "minmax(0, 1fr)",
            xl: "minmax(0, 1fr) 420px",
          }}
          gap={4}
          alignItems="start"
        >
          <Box
            minW={0}
            border="1px solid"
            borderColor="border.default"
            borderRadius="md"
            bg="bg.subtle"
          >
            <HStack
              px={3}
              py={3}
              spacing={3}
              borderBottom="1px solid"
              borderColor="border.default"
            >
              <Bone h={3} w="80px" />
              <Bone h={3} w="40px" />
              <Bone h={5} w="56px" />
              <Box flex="1" />
              <Bone h={3} w="64px" display={{ base: "none", md: "block" }} />
            </HStack>
            <Box px={3} pt={3} pb={2}>
              <Bone h={8} w="full" />
            </Box>
            <Box px={2} pb={2} overflow="hidden">
              {[0, 1, 2, 2, 1, 2, 3, 3, 1, 2].map((level, index) => (
                <HStack
                  key={index}
                  h="36px"
                  ml={`${level * 20}px`}
                  pl={2}
                  spacing={2}
                  borderLeft={level ? "1px solid" : undefined}
                  borderLeftColor="whiteAlpha.100"
                  borderBottom="1px solid"
                  borderBottomColor="whiteAlpha.100"
                >
                  <Bone boxSize="10px" flexShrink={0} />
                  <Bone h={5} w="42px" flexShrink={0} />
                  <Bone
                    h={3}
                    w={index % 3 === 0 ? "96px" : "72px"}
                    flexShrink={0}
                  />
                  <Bone
                    h={3}
                    flex="1"
                    maxW={index % 2 === 0 ? "200px" : "130px"}
                    minW="24px"
                  />
                </HStack>
              ))}
            </Box>
          </Box>
          <Box
            minW={0}
            border="1px solid"
            borderColor="border.default"
            borderRadius="md"
            bg="bg.subtle"
            p={4}
          >
            <HStack justify="space-between" mb={4}>
              <Bone h={4} w="64px" />
              <Bone h={5} w="64px" />
            </HStack>
            <HStack mb={4}>
              <Bone h={5} w="42px" />
              <Bone h={3} w="80px" />
            </HStack>
            {[0, 1].map((index) => (
              <Box key={index} mb={4}>
                <Bone h={2} w="28px" mb={2} />
                <Bone h={3} w="90%" />
              </Box>
            ))}
            <HStack py={3} spacing={3}>
              <Bone h={3} w="56px" />
              <Bone h={3} w="28px" />
            </HStack>
            {[0, 1].map((index) => (
              <Box key={index} mt={3}>
                <Bone h={3} w={index ? "88px" : "40px"} mb={3} />
                <Box
                  border="1px solid"
                  borderColor="border.default"
                  borderRadius="md"
                  p={3}
                >
                  <Bone h={3} w="45%" mb={3} />
                  <Bone h={7} w="full" />
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
