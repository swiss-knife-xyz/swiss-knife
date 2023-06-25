import { useState, useEffect, useRef } from "react";
import { ReactNode } from "react";
import { Container, Flex } from "@chakra-ui/react";

interface MainContainerParams {
  children: ReactNode;
}

export default function MainContainer({ children }: MainContainerParams) {
  return (
    <Container mt="8" minW="70vw">
      <Flex
        flexDir={"column"}
        mt="0.5rem"
        p="4"
        h="70vh"
        border="1px"
        borderColor={"custom.pale"}
        rounded={"lg"}
      >
        {children}
      </Flex>
    </Container>
  );
}
