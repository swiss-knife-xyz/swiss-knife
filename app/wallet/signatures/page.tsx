"use client";

type MessageInput = {
  string: string;
};

type TypedDataInput = {
  types: Record<string, Array<{ name: string; type: string }>>;
  primaryType: string;
  message: Record<string, any>;
};

import { useState } from "react";
import {
  VStack,
  Center,
  Heading,
  Text,
  Textarea,
  Box,
  Button,
  Flex,
} from "@chakra-ui/react";
import { JsonTextArea } from "@/components/JsonTextArea";
import { parseAsString, useQueryState } from "next-usequerystate";

export default function WalletSignatures() {
  const [jsonData, setJsonData] = useQueryState<string>(
    "json",
    parseAsString.withDefault("")
  );
  const [message, setMessage] = useState<MessageInput>({
    string: "Swiss Knife",
  });
  const [typedData, setTypedData] = useState(() => {
    if (jsonData) {
      try {
        const parsed = JSON.parse(jsonData);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return "";
      }
    }
    return "";
  });

  const exampleTypedDataJSON = `{
    "types": {
      "IceCreamOrder": [
        {
          "name": "flavor",
          "type": "string"
        },
        {
          "name": "scoops",
          "type": "int32"
        },
        {
          "name": "toppings",
          "type": "string"
        }
      ]
    },
    "primaryType": "IceCreamOrder",
    "message": {
      "flavor": "Chocolate Chip",
      "scoops": 2,
      "toppings": "Choco chips and sprinkles"
    }
  }`;

  return (
    <VStack
      spacing={10}
      align="stretch"
      maxW={{ base: "100%", md: "900px" }}
      mx="auto"
      minW={"40rem"}
      width="100%"
      px={{ base: 2, md: 4 }}
    >
      <Center flexDirection="column" pt={4}>
        <Heading as="h1" size="xl" mb={3} textAlign="center" color="white">
          Signatures
        </Heading>
        <Text>View Signatures</Text>
      </Center>
      <VStack gap={2}>
        <Box position="relative" width="100%" overflow="hidden">
          <Textarea
            value={message.string}
            onChange={(e) => setMessage({ string: e.target.value })}
            borderColor={"gray.400"}
          />
          <Flex my={4} alignItems="end" justifyContent="end">
            <Button colorScheme="blue">Sign Message</Button>
          </Flex>
        </Box>
        <Center flexDirection="column" my={4}>
          <Text>OR</Text>
        </Center>
        <Box position="relative" width="100%" overflow="hidden">
          <JsonTextArea
            value={typedData}
            onChange={(value) => {
              setTypedData(value);
              if (!value) {
                setJsonData("");
              }
            }}
            height={"300px"}
            placeholder={exampleTypedDataJSON}
          />
          <Flex my={4} alignItems="end" justifyContent="end">
            <Button colorScheme="blue">Sign Typed Data</Button>
          </Flex>
        </Box>
      </VStack>
    </VStack>
  );
}
