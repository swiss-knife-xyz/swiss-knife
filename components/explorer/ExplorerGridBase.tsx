import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Center,
  Input,
  InputGroup,
  InputRightElement,
  SimpleGrid,
} from "@chakra-ui/react";
import { CloseIcon } from "@chakra-ui/icons";
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
  const [searchExplorer, setSearchExplorer] = useState<string>();
  const [filteredExplorerNames, setFilteredExplorerNames] = useState<string[]>(
    []
  );

  useEffect(() => {
    setFilteredExplorerNames(
      Object.keys(explorersData).filter((explorerName) => {
        if (!searchExplorer) return true;

        return (
          explorerName
            .toLowerCase()
            .indexOf(searchExplorer.toLocaleLowerCase()) !== -1
        );
      })
    );
  }, [searchExplorer, explorersData]);

  return (
    <Box>
      <Center pb="0.5rem">
        <InputGroup maxW="30rem">
          <Input
            placeholder="search explorers 🔎"
            value={searchExplorer}
            onChange={(e) => setSearchExplorer(e.target.value)}
            borderColor={"whiteAlpha.300"}
          />
          {searchExplorer && (
            <InputRightElement width="3rem">
              <Button
                size="xs"
                variant={"ghost"}
                onClick={() => setSearchExplorer("")}
              >
                <CloseIcon />
              </Button>
            </InputRightElement>
          )}
        </InputGroup>
      </Center>
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
          {filteredExplorerNames.map((explorerName, i) => (
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
    </Box>
  );
};
