import { useSearchParams } from "next/navigation";
import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Center,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
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
  Icon,
} from "@chakra-ui/react";
import { CloseIcon } from "@chakra-ui/icons";
import { FiSearch, FiFilter } from "react-icons/fi";
import { parseAsBoolean, useQueryState } from "nuqs";
import { useLocalStorage } from "usehooks-ts";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
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
      <Center pb={4}>
        <HStack spacing={3}>
          <InputGroup maxW="24rem">
            <InputLeftElement>
              <Icon as={FiSearch} color="gray.400" boxSize={4} />
            </InputLeftElement>
            <Input
              placeholder="Search explorers..."
              value={searchExplorer}
              onChange={(e) => setSearchExplorer(e.target.value)}
              bg="whiteAlpha.50"
              border="1px solid"
              borderColor="whiteAlpha.200"
              _hover={{ borderColor: "whiteAlpha.300" }}
              _focus={{
                borderColor: "blue.400",
                boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
              }}
              color="gray.100"
              _placeholder={{ color: "gray.500" }}
            />
            {searchExplorer && (
              <InputRightElement>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => setSearchExplorer("")}
                  _hover={{ bg: "whiteAlpha.200" }}
                >
                  <CloseIcon boxSize={3} />
                </Button>
              </InputRightElement>
            )}
          </InputGroup>
          <Popover>
            <PopoverTrigger>
              <Button
                variant="outline"
                borderColor="whiteAlpha.200"
                px={4}
                py={2}
                h="auto"
                _hover={{
                  bg: "whiteAlpha.100",
                  borderColor: "whiteAlpha.300",
                }}
              >
                <HStack spacing={2}>
                  <Icon as={FiFilter} boxSize={4} />
                  <Text fontSize="sm">
                    Chains
                    {chainIdsSelected.length > 0 &&
                      ` (${chainIdsSelected.length})`}
                  </Text>
                </HStack>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              w="12rem"
              bg="gray.800"
              border="1px solid"
              borderColor="whiteAlpha.200"
            >
              <PopoverArrow bg="gray.800" />
              <PopoverCloseButton />
              <PopoverBody>
                <Text color="gray.300" fontSize="sm" mb={2}>
                  Select chains:
                </Text>
                <SimpleGrid spacing={1}>
                  {chainIdOptions.map((chainId, i) => (
                    <GridItem key={i}>
                      <Button
                        w="full"
                        size="sm"
                        variant="ghost"
                        justifyContent="flex-start"
                        onClick={() => {
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
                            ? "whiteAlpha.200"
                            : "transparent"
                        }
                        _hover={{ bg: "whiteAlpha.100" }}
                      >
                        <HStack spacing={2}>
                          <Image
                            src={chainIdToImage[chainId]}
                            alt={chainIdToChain[chainId].name}
                            w="1rem"
                            bg="white"
                            rounded="full"
                          />
                          <Text fontSize="sm" color="gray.200">
                            {chainIdToChain[chainId].name}
                          </Text>
                        </HStack>
                      </Button>
                    </GridItem>
                  ))}
                  {chainIdsSelected.length > 0 && (
                    <GridItem>
                      <Center mt={2}>
                        <Button
                          size="xs"
                          colorScheme="red"
                          variant="ghost"
                          onClick={() => setChainIdsSelected([])}
                        >
                          Clear All
                        </Button>
                      </Center>
                    </GridItem>
                  )}
                </SimpleGrid>
              </PopoverBody>
            </PopoverContent>
          </Popover>
          {explorerType === ExplorerType.ADDRESS && (
            <Tooltip
              label="Filter explorers only for contracts"
              placement="top"
            >
              <Button
                size="sm"
                variant={forContracts ? "solid" : "outline"}
                colorScheme={forContracts ? "purple" : "gray"}
                borderColor={forContracts ? undefined : "whiteAlpha.200"}
                _hover={{
                  bg: forContracts ? undefined : "whiteAlpha.100",
                  borderColor: forContracts ? undefined : "whiteAlpha.300",
                }}
                onClick={() => setForContracts(!forContracts)}
              >
                🤖
              </Button>
            </Tooltip>
          )}
        </HStack>
      </Center>
      <Box
        mt={4}
        px={4}
        minH="30rem"
        maxH="30rem"
        overflow="auto"
        borderRadius="lg"
        border="1px solid"
        borderColor="whiteAlpha.100"
        bg="whiteAlpha.50"
        sx={{
          "::-webkit-scrollbar": {
            w: "8px",
          },
          "::-webkit-scrollbar-track": {
            bg: "whiteAlpha.100",
            rounded: "lg",
          },
          "::-webkit-scrollbar-thumb": {
            bg: "whiteAlpha.300",
            rounded: "lg",
            _hover: {
              bg: "whiteAlpha.400",
            },
          },
        }}
      >
        {favoriteExplorerNames.length > 0 && (
          <>
            <Box py={4}>
              <Text fontSize="sm" fontWeight="medium" color="gray.300" mb={3}>
                ⭐ Favorites
              </Text>
              <DndProvider backend={HTML5Backend}>
                <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} gap={4}>
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
            <Divider borderColor="whiteAlpha.200" />
          </>
        )}
        <Box py={4}>
          <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} gap={4}>
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
    </Box>
  );
};
