"use client";

import subdomains from "@/subdomains";
import { getPath } from "@/utils";
import {
  Stack,
  Box,
  Center,
  Container,
  Heading,
  VStack,
  Text,
  Link,
} from "@chakra-ui/react";

const Card = ({
  title,
  description,
  url,
}: {
  title: string;
  description: string;
  url: string;
}) => {
  return (
    <Link
      href={url}
      _hover={{
        textDecor: "none",
      }}
    >
      <Box
        flex={1}
        border="1px"
        borderColor="blue.300"
        rounded="1rem"
        cursor={"pointer"}
        _hover={{
          border: "2px",
          borderColor: "blue.500",
          bg: "whiteAlpha.50",
        }}
      >
        <Center py={6} px={6}>
          <VStack>
            <Heading
              as="h2"
              fontWeight="semibold"
              fontSize={"lg"}
              whiteSpace="nowrap" // Prevent word from breaking
              pb="3"
              borderBottom={"1px"}
              borderColor={"whiteAlpha.400"}
            >
              {title}
            </Heading>
            <Text pt="1" textAlign="center" color={"cyan.100"} fontSize={"sm"}>
              ({description})
            </Text>
          </VStack>
        </Center>
      </Box>
    </Link>
  );
};

const Explorer = () => {
  return (
    <>
      <Container mt={10} pb={10} alignItems="center">
        <Text>or try these out:</Text>
        <Stack
          mt={2}
          direction={{ base: "column", md: "row" }}
          alignItems={{ base: "center", md: "stretch" }}
          spacing={5}
          justifyContent="space-between"
        >
          <Card
            title="USDC"
            description="contract"
            url={`${getPath(
              subdomains.EXPLORER
            )}address/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48`}
          />
          <Card
            title="Seaport MatchOrders"
            description="tx"
            url={`${getPath(
              subdomains.EXPLORER
            )}tx/0x242810fae4b8279dfeb728ccf29b575e792bc575e7c48461495cae3d7846a821`}
          />
        </Stack>
      </Container>
    </>
  );
};

export default Explorer;
