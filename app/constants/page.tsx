"use client";

import { Heading, Table, Tbody, Th, Thead, Tr, Td, Box, HStack, Text, Icon } from "@chakra-ui/react";
import { FiHash } from "react-icons/fi";
import { Layout } from "@/components/Layout";
import { constants } from "@/data/constants";
import { CopyToClipboard } from "@/components/CopyToClipboard";

const Constants = () => {
  return (
    <Layout>
      <Box
        p={6}
        bg="rgba(0, 0, 0, 0.05)"
        backdropFilter="blur(5px)"
        borderRadius="xl"
        border="1px solid"
        borderColor="whiteAlpha.50"
        maxW="1400px"
        mx="auto"
        w="full"
      >
        {/* Page Header */}
        <Box mb={8} textAlign="center">
          <HStack justify="center" spacing={3} mb={4}>
            <Icon as={FiHash} color="blue.400" boxSize={8} />
            <Heading size="xl" color="gray.100" fontWeight="bold" letterSpacing="tight">
              Constants
            </Heading>
          </HStack>
          <Text color="gray.400" fontSize="lg" maxW="600px" mx="auto">
            Common Ethereum constants for quick reference.
          </Text>
        </Box>

        <Box overflowX="auto">
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th color="gray.400">Name</Th>
                <Th color="gray.400">Value</Th>
                <Th></Th>
              </Tr>
            </Thead>
            <Tbody>
              {constants.map((c, i) => (
                <Tr key={i} _hover={{ bg: "whiteAlpha.50" }}>
                  <Td color="gray.300">{c.label}</Td>
                  <Td
                    maxW="20rem"
                    whiteSpace="nowrap"
                    overflowX="auto"
                    fontFamily="mono"
                    color="gray.100"
                    sx={{
                      "::-webkit-scrollbar": {
                        h: "8px",
                      },
                      "::-webkit-scrollbar-track": {
                        bg: "whiteAlpha.100",
                        rounded: "lg",
                      },
                      "::-webkit-scrollbar-thumb": {
                        bg: "whiteAlpha.300",
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
        </Box>
      </Box>
    </Layout>
  );
};

export default Constants;
