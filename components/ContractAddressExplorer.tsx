"use client";

import { NetworkSelect } from "@/components/NetworkSelect";
import React from "react";
import { Box, HStack, IconButton, Link, Text } from "@chakra-ui/react";
import { ExternalLink } from "lucide-react";
import { ExplorerGridBase } from "./explorer/ExplorerGridBase";
import { addressExplorers } from "@/data/addressExplorers";
import { chainIdToChain } from "@/data/common";
import { ExplorerType } from "@/types";
import { CopyToClipboard } from "./CopyToClipboard";

export default function ContractAddressExplorer({
  address,
  chainId,
  onChainChange,
}: {
  address: string;
  chainId: number;
  onChainChange: (chainId: number) => void;
}) {
  const explorer = chainIdToChain[chainId]?.blockExplorers?.default;
  return (
    <Box minW={0}>
      <Box
        bg="bg.subtle"
        border="1px solid"
        borderColor="border.default"
        rounded="lg"
        p={{ base: 4, md: 5 }}
        mb={4}
      >
        <HStack justify="space-between" spacing={3} mb={2}>
          <Text fontSize="xs" fontWeight="medium" color="text.secondary">
            Address
          </Text>
          <NetworkSelect
            ariaLabel="Address network"
            chainId={chainId}
            onChange={(nextChainId) => {
              if (nextChainId !== chainId) onChainChange(nextChainId);
            }}
            size="sm"
            boxProps={{ w: { base: "160px", md: "200px" }, minW: 0 }}
          />
        </HStack>
        <HStack spacing={3} align="start" minW={0}>
          <Text
            fontFamily="mono"
            fontSize={{ base: "sm", md: "md" }}
            lineHeight="tall"
            overflowWrap="anywhere"
            minW={0}
          >
            {address}
          </Text>
          <HStack spacing={1} flexShrink={0}>
            <CopyToClipboard
              textToCopy={address}
              aria-label="Copy address"
              size="xs"
            />
            {explorer && (
              <IconButton
                as={Link}
                href={`${explorer.url.replace(/\/$/, "")}/address/${address}`}
                isExternal
                aria-label={`Open address on ${explorer.name}`}
                title={`Open on ${explorer.name}`}
                icon={<ExternalLink size={16} />}
                size="xs"
                variant="ghost"
                color="whiteAlpha.700"
                _hover={{ color: "white", bg: "whiteAlpha.200" }}
              />
            )}
          </HStack>
        </HStack>
      </Box>
      <Text fontSize="sm" color="text.secondary" mb={4}>
        This address isn’t a contract on this network. Browse it using any of
        the explorers below.
      </Text>
      <ExplorerGridBase
        explorersData={addressExplorers}
        explorerType={ExplorerType.ADDRESS}
        addressOrTx={address}
        initialChainIds={[chainId]}
        syncFiltersToUrl={false}
        showFilters={false}
      />
    </Box>
  );
}
