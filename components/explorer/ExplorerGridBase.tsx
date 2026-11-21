import { useSearchParams } from "next/navigation";
import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  Portal,
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
import { FiSearch, FiFilter, FiCode } from "react-icons/fi";
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
  syncFiltersToUrl?: boolean;
  showFilters?: boolean;
  initialChainIds?: number[];
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
  syncFiltersToUrl = true,
  showFilters = true,
  initialChainIds = [],
}: Params) => {
  const searchParams = useSearchParams();

  const [searchExplorer, setSearchExplorer] = useState<string>("");
  const [chainIdsSelected, setChainIdsSelected] = useState<number[]>(initialChainIds);

  const [favoriteExplorerNames, setFavoriteExplorerNames] = useLocalStorage<
    string[]
  >(
    `${
      explorerType === ExplorerType.ADDRESS ? "address" : "tx"
    }-favorite-explorers`,
    [],
    { initializeWithValue: false }
  );

  const forContractsFromURL = searchParams.get("forContracts");
  const [urlForContracts, setUrlForContracts] = useQueryState<boolean>(
    "forContracts",
    parseAsBoolean.withDefault(
      forContractsFromURL ? forContractsFromURL === "true" : false
    )
  );
  const [localForContracts, setLocalForContracts] = useState(false);
  const forContracts = syncFiltersToUrl ? urlForContracts : localForContracts;
  const setForContracts = syncFiltersToUrl ? setUrlForContracts : setLocalForContracts;

  const toggleFavorite = (explorerName: string) => {
    if (!explorersData[explorerName]) return;
    setFavoriteExplorerNames((names) =>
      names.includes(explorerName)
        ? names.filter((name) => name !== explorerName)
        : [...names, explorerName]
    );
  };

  const swapFavExplorers = useCallback(
    (i: number, j: number) => {
      // swapping explorer i_th with j_th
      setFavoriteExplorerNames((prev) => swap(prev, i, j));
    },
    [setFavoriteExplorerNames]
  );

  useEffect(() => {
    if (!syncFiltersToUrl) return;
    setUrlForContracts(
      forContractsFromURL ? forContractsFromURL === "true" : false
    );
  }, [forContractsFromURL, setUrlForContracts, syncFiltersToUrl]);

  const filteredExplorerNames = useMemo(
    () => Object.keys(explorersData)
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
        }),
    [searchExplorer, chainIdsSelected, forContracts, explorerType, explorersData]
  );

  return (
    <Box minW={0} w="full">
      <Center>
        <HStack spacing={0} gap={2} w="full" flexWrap="wrap" justify="flex-end">
          <InputGroup w="full" minW={0}>
            <InputLeftElement>
              <Icon as={FiSearch} color="gray.400" boxSize={4} />
            </InputLeftElement>
            <Input
              placeholder="Search explorers..."
              aria-label="Search explorers"
              pr={!showFilters ? (searchExplorer ? 12 : 4) : explorerType === ExplorerType.ADDRESS ? (searchExplorer ? 32 : 24) : (searchExplorer ? 24 : 16)}
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
            <InputRightElement h="full" w="auto" gap={1} pr={1}>
              {searchExplorer && (
                <Button aria-label="Clear explorer search" size="xs" variant="ghost" minW={8} h={8} p={0} onClick={() => setSearchExplorer("")}>
                  <CloseIcon boxSize={3} />
                </Button>
              )}
              {showFilters && <Popover isLazy lazyBehavior="unmount">
                <PopoverTrigger>
                  <Button
                    aria-label={`Chains${chainIdsSelected.length ? ` (${chainIdsSelected.length})` : ""}`}
                    title="Filter chains"
                    variant="ghost"
                    color={chainIdsSelected.length ? "primary.400" : "text.secondary"}
                    minW={8}
                    px={2}
                    h={8}
                    _hover={{
                      bg: "whiteAlpha.100",
                      borderColor: "whiteAlpha.300",
                    }}
                  >
                    <HStack spacing={2}>
                      <Icon as={FiFilter} boxSize={4} />
                      {chainIdsSelected.length > 0 && <Text fontSize="xs">{chainIdsSelected.length}</Text>}
                    </HStack>
                  </Button>
                </PopoverTrigger>
                <Portal>
                <PopoverContent
                  w="12rem"
                  bg="bg.subtle"
                  color="text.primary"
                  border="1px solid"
                  borderColor="border.default"
                >
                  <PopoverArrow bg="bg.subtle" />
                  <PopoverCloseButton />
                  <PopoverBody>
                    <Text color="text.secondary" fontSize="sm" mb={2}>
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
                                ? "bg.muted"
                                : "transparent"
                            }
                            _hover={{ bg: "bg.muted" }}
                          >
                            <HStack spacing={2}>
                              <Image
                                src={chainIdToImage[chainId]}
                                alt={chainIdToChain[chainId].name}
                                w="1rem"
                                bg="white"
                                rounded="full"
                              />
                              <Text fontSize="sm" color="text.primary">
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
                </Portal>
              </Popover>}
              {showFilters && explorerType === ExplorerType.ADDRESS && (
                <Tooltip
                  label="Filter explorers only for contracts"
                  placement="top"
                >
                  <Button
                    aria-label="Contracts only"
                    aria-pressed={forContracts}
                    size="sm"
                    h={8}
                    minW={8}
                    px={2}
                    variant="ghost"
                    color={forContracts ? "primary.400" : "text.secondary"}
                    bg={forContracts ? "whiteAlpha.200" : "transparent"}
                    borderColor={forContracts ? undefined : "whiteAlpha.200"}
                    _hover={{
                      bg: forContracts ? undefined : "whiteAlpha.100",
                      borderColor: forContracts ? undefined : "whiteAlpha.300",
                    }}
                    onClick={() => setForContracts(!forContracts)}
                  >
                    <Icon as={FiCode} boxSize={4} />
                  </Button>
                </Tooltip>
              )}
            </InputRightElement>
          </InputGroup>
        </HStack>
      </Center>
      <Box mt={{ base: 3, md: 4 }} minW={0} w="full">
        {favoriteExplorerNames.some((name) => explorersData[name]) && (
          <>
            <Box py={{ base: 2, md: 4 }}>
              <Text fontSize="sm" fontWeight="medium" color="gray.300" mb={3}>
                ⭐ Favorites
              </Text>
              <DndProvider backend={HTML5Backend}>
                <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} gap={4}>
                  {favoriteExplorerNames.map((explorerName, i) => explorersData[explorerName] && (
                    <FavoriteExplorerGridItem
                      key={explorerName}
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
        <Box py={{ base: 2, md: 4 }}>
          <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} gap={4}>
            {filteredExplorerNames
              .filter((name) => !favoriteExplorerNames.includes(name))
              .map((explorerName) => (
                <ExplorerGridItem
                  key={explorerName}
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
