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
import { txExplorers } from "@/data/txExplorers";

const Tx = ({
  params: { tx },
}: {
  params: {
    tx: string;
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
        {Object.keys(txExplorers).map((label, i) => (
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
            <Link href={`${txExplorers[label].baseUrl}${tx}`} isExternal>
              <Center flexDir={"column"} h="100%" p="1rem">
                <Image
                  bg="white"
                  w="2rem"
                  src={`https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&size=128&url=${txExplorers[label].baseUrl}`}
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

export default Tx;
