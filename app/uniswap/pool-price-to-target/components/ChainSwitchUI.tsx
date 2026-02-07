import { Box, Button, Center, Text, VStack } from "@chakra-ui/react";
import { ConnectButton } from "@/components/ConnectButton";
import { chainIdToChain } from "@/data/common";
import { quoterAddress } from "../../lib/constants";

interface ChainSwitchUIProps {
  chain?: { id: number; name?: string }; // Make name optional as it might not always be available
  switchChain?: (args: { chainId: number }) => void;
  isConnected: boolean;
}

export const ChainSwitchUI: React.FC<ChainSwitchUIProps> = ({
  chain,
  switchChain,
  isConnected,
}) => {
  const chainNotSupported = chain && !quoterAddress[chain.id];

  if (!isConnected) {
    return (
      <Center mt={8}>
        <Box textAlign="center">
          <Text fontSize="lg" mb={4}>
            Please connect your wallet to use this tool
          </Text>
          <ConnectButton />
        </Box>
      </Center>
    );
  }

  if (chainNotSupported) {
    return (
      <Center mt={8}>
        <Box textAlign="center">
          <Text fontSize="lg" mb={4} color="red.400">
            Chain not supported. Please switch to a supported chain:
          </Text>
          <VStack spacing={2}>
            {Object.keys(quoterAddress)
              .map((chainId) => parseInt(chainId))
              .map((chainId) => (
                <Button
                  key={chainId}
                  onClick={() => switchChain?.({ chainId })}
                  colorScheme="blue"
                >
                  {chainIdToChain[chainId]?.name || `Chain ${chainId}`}
                </Button>
              ))}
          </VStack>
        </Box>
      </Center>
    );
  }

  return null; // Render nothing if connected and chain is supported
};
