"use client";

import {
  Box,
  Heading,
  Spacer,
  Table,
  Tbody,
  Th,
  Thead,
  Tr,
  Td,
} from "@chakra-ui/react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MainContainer from "@/components/MainContainer";
import { constants } from "@/data/constants";
import CopyToClipboard from "@/components/CopyToClipboard";

export default function Constants() {
  return (
    <Box>
      <Navbar />
      <MainContainer>
        <Heading>Constants</Heading>
        <Table variant="simple" mt="2rem">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Value</Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {constants.map((c, i) => (
              <Tr key={i}>
                <Td>{c.label}</Td>
                <Td
                  maxW="20rem"
                  whiteSpace={"nowrap"}
                  overflowX={"auto"}
                  sx={{
                    "::-webkit-scrollbar": {
                      h: "12px",
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
                  {c.data}
                </Td>
                <Td>
                  <CopyToClipboard txt={c.data} />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </MainContainer>
      <Spacer />
      <Footer />
    </Box>
  );
}
