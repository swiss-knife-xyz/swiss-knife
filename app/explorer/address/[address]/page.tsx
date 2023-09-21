"use client";

import {
  Box,
  Center,
  GridItem,
  Link,
  SimpleGrid,
  Image,
  Text,
} from "@chakra-ui/react";
import { addressExplorers } from "@/data/addressExplorers";

const Address = ({
  params: { address },
}: {
  params: {
    address: string;
  };
}) => {
  return (
    <Box
      px="1rem"
      minH="30rem"
      maxH="30rem"
      overflow="scroll"
      overflowX="auto"
      overflowY="auto"
      sx={{
        "::-webkit-scrollbar": {
          w: "10px",
        },
        "::-webkit-scrollbar-track ": {
          bg: "gray.700",
          rounded: "lg",
        },
        "::-webkit-scrollbar-thumb": {
          bg: "gray.600",
          rounded: "lg",
        },
      }}
    >
      <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} gap={6}>
        {Object.keys(addressExplorers).map((label, i) => (
          <GridItem
            key={i}
            border="2px solid"
            borderColor={"gray.500"}
            bg={"white"}
            color={"black"}
            _hover={{
              cursor: "pointer",
              bgColor: "gray.600",
              color: "white",
            }}
            rounded="lg"
          >
            <Link
              href={`${addressExplorers[label].baseUrl}${address}`}
              isExternal
            >
              {/* TODO: highlight with a robot emoji if explorer is for contracts */}
              {/* TODO: allow bookmarking, and show the bookmarked explorers on the top */}
              <Center flexDir={"column"} h="100%" p="1rem">
                <Image
                  bg="white"
                  w="2rem"
                  src={`https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&size=128&url=${addressExplorers[label].baseUrl}`}
                  alt={label}
                  borderRadius="full"
                />
                <Text mt="0.5rem" textAlign={"center"}>
                  {label}
                </Text>
              </Center>
            </Link>
          </GridItem>
        ))}
      </SimpleGrid>
    </Box>
  );
};

export default Address;
