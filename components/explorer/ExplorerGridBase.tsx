import React from "react";
import { Box, SimpleGrid } from "@chakra-ui/react";
import { ExplorerGridItem } from "./ExplorerGridItem";
import { ExplorersData, ExplorerType } from "@/types";

interface Params {
  explorersData: ExplorersData;
  explorerType: ExplorerType;
  addressOrTx: string;
}

export const ExplorerGridBase = ({
  explorersData,
  explorerType,
  addressOrTx,
}: Params) => {
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
        {Object.keys(explorersData).map((explorerName, i) => (
          <ExplorerGridItem
            key={i}
            explorerName={explorerName}
            explorerData={explorersData[explorerName]}
            explorerType={explorerType}
            addressOrTx={addressOrTx}
          />
        ))}
      </SimpleGrid>
    </Box>
  );
};
