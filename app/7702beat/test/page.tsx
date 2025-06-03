"use client";
import { Container, Box, Text } from "@chakra-ui/react";
import { useAccount, useChainId, useCapabilities } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";

export default function TestPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: availableCapabilities } = useCapabilities({
    account: address,
    chainId,
  });

  return (
    <Container mt={10}>
      <ConnectButton />
      <Box mt={10}>
        <Text>Available Capabilities. ChainId: {chainId}</Text>
        <pre>{JSON.stringify(availableCapabilities, null, 2)}</pre>
      </Box>
    </Container>
  );
}
