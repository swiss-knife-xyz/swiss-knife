import { useSearchParams } from "next/navigation";
import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Center,
  HStack,
  Input,
  InputGroup,
  InputRightElement,
  SimpleGrid,
  Text,
  Image,
  GridItem,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverCloseButton,
  PopoverBody,
  Tooltip,
  Divider,
} from "@chakra-ui/react";
import { CloseIcon } from "@chakra-ui/icons";
import { parseAsBoolean, useQueryState } from "next-usequerystate";
import { useLocalStorage } from "usehooks-ts";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilter } from "@fortawesome/free-solid-svg-icons";
import { ExplorerGridItem, FavoriteExplorerGridItem } from "./ExplorerGridItem";
import { ExplorersData, ExplorerType } from "@/types";
import { c, chainIdToChain, chainIdToImage } from "@/data/common";
import { swap } from "@/utils";

interface Params {
  explorersData: ExplorersData;
  explorerType: ExplorerType;
  addressOrTx: string;
}

const chainIdOptions = [
  c.mainnet.id,
  c.arbitrum.id,
  c.avalanche.id,
  c.base.id,
  c.bsc.id,
  c.gnosis.id,
  c.optimism.id,
  c.polygon.id,
  c.zkSync.id,
  c.zora.id,
];

export const ExplorerGridBase = ({
  explorersData,
  explorerType,
  addressOrTx,
}: Params) => {
  const searchParams = useSearchParams();

  const [searchExplorer, setSearchExplorer] = useState<string>();
  const [filteredExplorerNames, setFilteredExplorerNames] = useState<string[]>(
    []
  );
  const [chainIdsSelected, setChainIdsSelected] = useState<number[]>([]);

  const [favoriteExplorerNames, setFavoriteExplorerNames] = useLocalStorage<
    string[]
  >(
    `${
      explorerType === ExplorerType.ADDRESS ? "address" : "tx"
    }-favorite-explorers`,
    []
  );

  const forContractsFromURL = searchParams.get("forContracts");
  const [forContracts, setForContracts] = useQueryState<boolean>(
    "forContracts",
    parseAsBoolean.withDefault(
      forContractsFromURL ? forContractsFromURL === "true" : false
    )
  );

  const toggleFavorite = (explorerName: string) => {
    if (favoriteExplorerNames.includes(explorerName)) {
      setFavoriteExplorerNames(
        favoriteExplorerNames.filter((name) => name !== explorerName)
      );
    } else {
      setFavoriteExplorerNames([...favoriteExplorerNames, explorerName]);
    }
  };

  const swapFavExplorers = useCallback(
    (i: number, j: number) => {
      // swapping explorer i_th with j_th
      setFavoriteExplorerNames((prev) => swap(prev, i, j));
    },
    [setFavoriteExplorerNames]
  );

  useEffect(() => {
    setForContracts(
      forContractsFromURL ? forContractsFromURL === "true" : false
    );
  }, [forContractsFromURL, setForContracts]);

  useEffect(() => {
    setFilteredExplorerNames(
      Object.keys(explorersData)
        .filter((explorerName) => {
          if (!searchExplorer) return true;

          return (
            explorerName
              .toLowerCase()
              .indexOf(searchExplorer.toLocaleLowerCase()) !== -1
          );
        })
        .filter((explorerName) => {
          if (chainIdsSelected.length === 0) return true;

          return chainIdsSelected.some((chainIdSelected) =>
            Object.keys(explorersData[explorerName].chainIdToLabel).includes(
              chainIdSelected.toString()
            )
          );
        })
        .filter((explorerName) => {
          if (explorerType === ExplorerType.ADDRESS && forContracts) {
            return explorersData[explorerName].forContracts;
          }
          return true;
        })
    );
  }, [
    searchExplorer,
    chainIdsSelected,
    forContracts,
    explorerType,
    explorersData,
  ]);

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
        <Popover>
          <PopoverTrigger>
            <Button ml="0.5rem" size={"xs"} py={"1.2rem"}>
              <HStack>
                <FontAwesomeIcon icon={faFilter} size="lg" />
                <Text>
                  Chains{" "}
                  {chainIdsSelected.length > 0 &&
                    `(${chainIdsSelected.length})`}
                </Text>
              </HStack>
            </Button>
          </PopoverTrigger>
          <PopoverContent w="11rem">
            <PopoverArrow />
            <PopoverCloseButton />
            <PopoverBody bg="bg.900">
              <Text>Select chains:</Text>
              <SimpleGrid>
                {chainIdOptions.map((chainId, i) => (
                  <GridItem key={i}>
                    <Button
                      pr="1.5rem"
                      size="xs"
                      variant={"ghost"}
                      onClick={() => {
                        // remove from the array
                        if (chainIdsSelected.includes(chainId)) {
                          setChainIdsSelected(
                            chainIdsSelected.filter((id) => id !== chainId)
                          );
                        } else {
                          setChainIdsSelected([...chainIdsSelected, chainId]);
                        }
                      }}
                      bg={
                        chainIdsSelected.includes(chainId)
                          ? "whiteAlpha.300"
                          : ""
                      }
                    >
                      <HStack>
                        <Image
                          src={chainIdToImage[chainId]}
                          alt={chainIdToChain[chainId].name}
                          w="1rem"
                          bg="white"
                          rounded="full"
                        />
                        <Text>{chainIdToChain[chainId].name}</Text>
                      </HStack>
                    </Button>
                  </GridItem>
                ))}
                {chainIdsSelected.length > 0 && (
                  <GridItem>
                    <Center>
                      <Button
                        size="xs"
                        variant={"ghost"}
                        onClick={() => setChainIdsSelected([])}
                        bg={"whiteAlpha.300"}
                      >
                        <Text>Clear</Text>
                      </Button>
                    </Center>
                  </GridItem>
                )}
              </SimpleGrid>
            </PopoverBody>
          </PopoverContent>
        </Popover>
        {explorerType === ExplorerType.ADDRESS && (
          <Tooltip label="Filter explorers only for contracts">
            <Button
              ml="0.5rem"
              size={"xs"}
              p={"1.2rem"}
              variant={forContracts ? "solid" : "outline"}
              bg={forContracts ? "whiteAlpha.500" : ""}
              onClick={() => setForContracts(!forContracts)}
            >
              🤖
            </Button>
          </Tooltip>
        )}
      </Center>
      <Box
        mt="1rem"
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
        {favoriteExplorerNames.length > 0 && (
          <>
            <Box>
              <Text fontSize="sm" fontWeight="bold">
                Favorites:
              </Text>
              <DndProvider backend={HTML5Backend}>
                <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} gap={6}>
                  {favoriteExplorerNames.map((explorerName, i) => (
                    <FavoriteExplorerGridItem
                      key={i}
                      explorerName={explorerName}
                      explorerData={explorersData[explorerName]}
                      explorerType={explorerType}
                      addressOrTx={addressOrTx}
                      toggleFavorite={toggleFavorite}
                      index={i}
                      handleDropHover={swapFavExplorers}
                    />
                  ))}
                </SimpleGrid>
              </DndProvider>
            </Box>
            <Divider my="1rem" />
          </>
        )}
        <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} gap={6}>
          {filteredExplorerNames
            .filter((name) => !favoriteExplorerNames.includes(name))
            .map((explorerName, i) => (
              <ExplorerGridItem
                key={i}
                explorerName={explorerName}
                explorerData={explorersData[explorerName]}
                explorerType={explorerType}
                addressOrTx={addressOrTx}
                toggleFavorite={toggleFavorite}
              />
            ))}
        </SimpleGrid>
      </Box>
    </Box>
  );
};
