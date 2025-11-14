import {
  Alert, AlertIcon, Box, HStack, Heading, Link, Spacer,
} from "@chakra-ui/react";
import { DarkSelect } from "@/components/DarkSelect";
import { ConnectButton } from "@/components/ConnectButton";
import { networkOptions } from "@/data/common";
import { AbiType, SelectedOptionState } from "@/types";
import { getPath } from "@/utils";
import subdomains from "@/subdomains";

const proxyOptions = [
  { label: "Proxy", value: "proxy" },
  { label: "Contract", value: "contract" },
] as const;

interface ContractHeaderProps {
  abi: AbiType;
  address: string;
  chainId: number;
  selectedNetworkOption: SelectedOptionState;
  setSelectedNetworkOption: (option: SelectedOptionState) => void;
  implementationAddress: string | null;
  isInteractingAsProxy: boolean;
  setIsInteractingAsProxy: (isProxy: boolean) => void;
  setAbi: (abi: AbiType | null) => void;
  implementationAbi: AbiType | null;
  proxyAbi: AbiType | null;
  isAbiDecoded: boolean;
}

export const ContractHeader = ({
  abi,
  address,
  chainId,
  selectedNetworkOption,
  setSelectedNetworkOption,
  implementationAddress,
  isInteractingAsProxy,
  setIsInteractingAsProxy,
  setAbi,
  implementationAbi,
  proxyAbi,
  isAbiDecoded,
}: ContractHeaderProps) => {
  return (
    <Box>
      <DarkSelect
        boxProps={{ w: "20rem", margin: "auto" }}
        selectedOption={selectedNetworkOption}
        setSelectedOption={setSelectedNetworkOption}
        options={networkOptions}
      />

      {isAbiDecoded && (
        <Alert status="info" mt={4} rounded="lg">
          <AlertIcon />
          Contract not verified; used whatsabi & evmole to determine functions.
        </Alert>
      )}
      {implementationAddress && (
        <Alert status="info" mt={4} rounded="lg">
          <AlertIcon />
          This is a Proxy Contract for implementation:
          <Link
            ml="0.2rem"
            href={`${getPath(subdomains.EXPLORER.base)}contract/${implementationAddress}/${chainId}`}
            fontWeight="bold"
            isExternal
          >
            {implementationAddress}
          </Link>
        </Alert>
      )}

      {abi.name.length > 0 && (
        <HStack mt={4}>
          <Box position="sticky" top="0" zIndex={1} p={2} boxShadow="md" bg="bg.900">
            Contract Name: <b>{abi.name}</b>
          </Box>
          <Spacer />
          <ConnectButton expectedChainId={chainId} />
        </HStack>
      )}

      {implementationAddress && (
        <HStack p={2}>
          <Box fontStyle="italic">Interacting as</Box>
          <DarkSelect
            boxProps={{ w: "15rem" }}
            selectedOption={{
              label: isInteractingAsProxy ? "Proxy" : "Contract",
              value: isInteractingAsProxy ? "proxy" : "contract",
            }}
            setSelectedOption={(option) => {
              if (option) {
                const isProxy = option.value === "proxy";
                setAbi(isProxy ? implementationAbi : proxyAbi);
                setIsInteractingAsProxy(isProxy);
              }
            }}
            options={proxyOptions}
          />
        </HStack>
      )}
    </Box>
  );
};
