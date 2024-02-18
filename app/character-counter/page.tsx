"use client";

import React, { useEffect, useState } from "react";
import {
  Heading,
  Textarea,
  FormControl,
  FormLabel,
  HStack,
  Spacer,
  Text,
  Container,
  VStack,
} from "@chakra-ui/react";
const CharacterCounter = () => {
  const [input, setInput] = useState<string>();
  const [count, setCount] = useState<number>();

  useEffect(() => {
    document.addEventListener("mouseup", (e) => {
      if (document.activeElement !== document.getElementById("input")) {
        setCount(input?.length);
      }
    });
    return () => {
      document.removeEventListener("mouseup", () => {});
    };
  }, [input]);

  return (
    <>
      <Heading color={"custom.pale"}>Character Counter</Heading>
      <Container maxWidth="inherit">
        <VStack spacing={5}>
          <FormControl mt="1rem">
            <FormLabel>
              <HStack>
                <Text>Text</Text>
                <Spacer />
              </HStack>
            </FormLabel>
            <Textarea
              placeholder=""
              id="input"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setCount(e.target.value.length);
              }}
              rows={6}
              onMouseUpCapture={(e) =>
                setCount(
                  window.getSelection()?.toString().length !== 0
                    ? window.getSelection()?.toString().length
                    : input?.length
                )
              }
            ></Textarea>
            <FormLabel mt="1rem">
              <HStack>
                <Text fontWeight="bold">Characters : {count}</Text>
              </HStack>
            </FormLabel>
          </FormControl>
        </VStack>
        <Text mt="2rem" fontSize={"sm"}>
          (Note: select on the input text to only get the character count for
          the selection)
        </Text>
      </Container>
    </>
  );
};

export default CharacterCounter;
