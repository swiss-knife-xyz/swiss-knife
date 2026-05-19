"use client";

import { memo } from "react";
import {
  Box,
  HStack,
  VStack,
  Text,
  SimpleGrid,
  IconButton,
  Image,
  Spinner,
  Tooltip,
} from "@chakra-ui/react";
import { RefreshCw } from "lucide-react";
import { ChainGroupData } from "../hooks/usePortfolio";
import { getChainInfo } from "../lib/chains";
import { formatUsd, formatUsdCompact } from "../lib/format";

interface PortfolioSidebarProps {
  totalValueUsd: number;
  chainGroups: ChainGroupData[];
  currentChainId?: number;
  isFetching: boolean;
  onChainClick: (chainId: number) => void;
  onReload: () => void;
}

function PortfolioSidebarImpl({
  totalValueUsd,
  chainGroups,
  currentChainId,
  isFetching,
  onChainClick,
  onReload,
}: PortfolioSidebarProps) {
  return (
    <Box
      p={5}
      bg="whiteAlpha.50"
      borderRadius="lg"
      border="1px solid"
      borderColor="whiteAlpha.200"
      w="full"
    >
      <HStack
        align="stretch"
        spacing={{ base: 4, md: 6 }}
        flexDir={{ base: "column", md: "row" }}
      >
        <VStack
          align="flex-start"
          spacing={1}
          flexShrink={0}
          minW={{ md: "260px" }}
        >
          <HStack justify="space-between" w="full">
            <Text fontSize="xs" color="whiteAlpha.700" letterSpacing="wider">
              PORTFOLIO VALUE
            </Text>
            <Tooltip label="Reload portfolio" placement="left" hasArrow>
              <IconButton
                aria-label="Reload portfolio"
                icon={
                  isFetching ? (
                    <Spinner size="sm" speed="0.6s" />
                  ) : (
                    <RefreshCw size={14} />
                  )
                }
                size="xs"
                variant="ghost"
                color="whiteAlpha.700"
                _hover={{ color: "white", bg: "whiteAlpha.100" }}
                onClick={onReload}
                isDisabled={isFetching}
              />
            </Tooltip>
          </HStack>
          <Text
            fontSize={{ base: "3xl", md: "4xl", lg: "5xl" }}
            fontWeight="700"
            color="white"
            letterSpacing="tight"
            lineHeight="1.1"
          >
            {formatUsd(totalValueUsd)}
          </Text>
        </VStack>

        <Box flex={1} minW={0}>
          <Text
            fontSize="xs"
            color="whiteAlpha.700"
            letterSpacing="wider"
            mb={2}
          >
            BY NETWORK
          </Text>
          {chainGroups.length === 0 ? (
            <Text color="whiteAlpha.600" fontSize="sm">
              No tokens found.
            </Text>
          ) : (
            <SimpleGrid
              columns={{ base: 2, sm: 3, md: 3, lg: 4, xl: 5 }}
              spacing={2}
            >
              {chainGroups.map((group) => {
                const info = getChainInfo(group.chainId);
                const isCurrent = currentChainId === group.chainId;
                return (
                  <Box
                    key={group.chainId}
                    as="button"
                    onClick={() => onChainClick(group.chainId)}
                    bg={isCurrent ? "whiteAlpha.200" : "whiteAlpha.100"}
                    _hover={{
                      bg: "whiteAlpha.300",
                      transform: "translateY(-1px)",
                      borderColor: "primary.400",
                    }}
                    borderRadius="md"
                    border="1px solid"
                    borderColor={
                      isCurrent ? "primary.500" : "whiteAlpha.200"
                    }
                    p={2.5}
                    textAlign="left"
                    transition="all 0.15s ease"
                  >
                    <HStack spacing={2} mb={1}>
                      {info.logo ? (
                        <Image
                          src={info.logo}
                          alt={info.name}
                          boxSize="18px"
                          borderRadius="full"
                          bg="white"
                          fallbackSrc="/icon.png"
                        />
                      ) : (
                        <Box
                          boxSize="18px"
                          bg="whiteAlpha.300"
                          borderRadius="full"
                        />
                      )}
                      <Text
                        fontSize="xs"
                        color="whiteAlpha.800"
                        noOfLines={1}
                        fontWeight="500"
                      >
                        {info.name}
                      </Text>
                    </HStack>
                    <Text fontSize="sm" color="white" fontWeight="600">
                      {formatUsdCompact(group.totalValueUsd)}
                    </Text>
                  </Box>
                );
              })}
            </SimpleGrid>
          )}
        </Box>
      </HStack>
    </Box>
  );
}

export const PortfolioSidebar = memo(PortfolioSidebarImpl);
