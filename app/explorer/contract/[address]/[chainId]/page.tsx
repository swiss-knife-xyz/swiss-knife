"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Box, Center, Grid, HStack, Spinner, Alert, AlertIcon,
} from "@chakra-ui/react";
import { PublicClient, createPublicClient, http } from "viem";
import { JsonFragment } from "ethers";

// Import the new modular components
import { ContractHeader } from "@/components/pages/contract-explorer/ContractHeader";
import { FunctionList } from "@/components/pages/contract-explorer/FunctionList";

import { AbiType, SelectedOptionState } from "@/types";
import { chainIdToChain, networkOptions } from "@/data/common";
import { fetchContractAbiRaw, processContractBytecode, getImplementationFromBytecodeIfProxy, slicedText } from "@/utils";
// ... (other necessary imports)

export const ContractPage = ({ params: { address, chainId } }: { params: { address: string; chainId: number; } }) => {
  const [evmole, setEvmole] = useState<any>(null);
  const networkOptionsIndex = networkOptions.findIndex((option) => option.value === chainId);
  
  const [selectedNetworkOption, setSelectedNetworkOption] = useState<SelectedOptionState>(networkOptions[networkOptionsIndex]);
  const [client, setClient] = useState<PublicClient | null>(null);

  const [abi, setAbi] = useState<AbiType | null>(null);
  const [isAbiDecoded, setIsAbiDecoded] = useState<boolean>(false);
  const [isFetchingAbi, setIsFetchingAbi] = useState<boolean>(true);
  const [unableToFetchAbi, setUnableToFetchAbi] = useState<boolean>(false);
  const [implementationAddress, setImplementationAddress] = useState<string | null>(null);
  const [implementationAbi, setImplementationAbi] = useState<AbiType | null>(null);
  const [proxyAbi, setProxyAbi] = useState<AbiType | null>(null);
  const [isInteractingAsProxy, setIsInteractingAsProxy] = useState<boolean>(false);

  const [readFunctions, setReadFunctions] = useState<JsonFragment[]>([]);
  const [writeFunctions, setWriteFunctions] = useState<JsonFragment[]>([]);

  useEffect(() => {
    import("evmole").then((module) => setEvmole(module));
  }, []);

  // The fetchSetAbi logic remains here as it's the core data-fetching for the page
  const fetchSetAbi = useCallback(async () => {
    // ... (The exact same data fetching logic as before)
  }, [address, chainId, evmole]);

  useEffect(() => {
    // ... (The exact same useEffects for setting client, fetching ABI, and sorting functions)
  }, [selectedNetworkOption, address, chainId, fetchSetAbi, abi]);
  
  // Update client when chainId changes
  useEffect(() => {
    setClient(createPublicClient({
      chain: chainIdToChain[chainId],
      transport: http(),
    }));
  }, [chainId]);

  if (isFetchingAbi) {
    return (
      <Center flexDir="column" minH="50vh">
        <Spinner size="xl" />
        <HStack mt={5}>
          <Box>Fetching ABI...</Box>
        </HStack>
      </Center>
    );
  }

  if (unableToFetchAbi) {
    return (
      <Center flexDir="column" minH="50vh">
        <Alert status="error" rounded="lg">
          <AlertIcon />
          Unable to Fetch ABI for this address
        </Alert>
      </Center>
    );
  }

  return (
    <Box flexDir="column" minW={abi ? "60rem" : "40rem"}>
      {abi && client && (
        <>
          <ContractHeader
            abi={abi}
            address={address}
            chainId={chainId}
            selectedNetworkOption={selectedNetworkOption}
            setSelectedNetworkOption={setSelectedNetworkOption}
            implementationAddress={implementationAddress}
            isInteractingAsProxy={isInteractingAsProxy}
            setIsInteractingAsProxy={setIsInteractingAsProxy}
            setAbi={setAbi}
            implementationAbi={implementationAbi}
            proxyAbi={proxyAbi}
            isAbiDecoded={isAbiDecoded}
          />
          <Grid templateColumns="repeat(2, 1fr)" gap={6} mt={5}>
            <FunctionList
              type="read"
              abi={abi}
              client={client}
              functions={readFunctions}
              address={address}
              chainId={chainId}
              isAbiDecoded={isAbiDecoded}
            />
            <FunctionList
              type="write"
              abi={abi}
              client={client}
              functions={writeFunctions}
              address={address}
              chainId={chainId}
              isAbiDecoded={isAbiDecoded}
            />
          </Grid>
        </>
      )}
    </Box>
  );
};
