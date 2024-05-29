"use client";

import { Heading, Table, Tbody, Th, Thead, Tr, Td } from "@chakra-ui/react";
import { Layout } from "@/components/Layout";
import { constants } from "@/data/constants";
import { CopyToClipboard } from "@/components/CopyToClipboard";

const Constants = () => {
  return (
    <Layout>
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
                <CopyToClipboard textToCopy={c.data} />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Layout>
  );
};

export default Constants;
