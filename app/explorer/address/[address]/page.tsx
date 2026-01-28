"use client";

import { Box, HStack, Text, Badge } from "@chakra-ui/react";
import { ExplorerGridBase } from "@/components/explorer/ExplorerGridBase";
import { addressExplorers } from "@/data/addressExplorers";
import { ExplorerType } from "@/types";

const Address = ({
  params: { address },
}: {
  params: {
    address: string;
  };
}) => {
  return (
    <Box w="full" maxW="1200px" mx="auto">
      <ExplorerGridBase
        explorersData={addressExplorers}
        explorerType={ExplorerType.ADDRESS}
        addressOrTx={address}
      />
      <HStack
        mt={4}
        p={3}
        bg="whiteAlpha.50"
        borderRadius="md"
        border="1px solid"
        borderColor="whiteAlpha.100"
        justify="center"
      >
        <Badge colorScheme="purple" fontSize="sm" px={2} py={1}>
          🤖
        </Badge>
        <Text color="gray.400" fontSize="sm">
          = Explorers specifically for smart contracts
        </Text>
      </HStack>
    </Box>
  );
};

export default Address;
