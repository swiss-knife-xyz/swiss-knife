import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { chainIdToChain } from "@/data/common";

interface ActiveSessionsProps {
  isConnected: boolean;
  activeSessions: any[];
  chainId: number;
  disconnectSession: (topic: string) => Promise<void>;
}

export default function ActiveSessions({
  isConnected,
  activeSessions,
  chainId,
  disconnectSession,
}: ActiveSessionsProps) {
  return (
    <Box
      p={{ base: 4, md: 6 }}
      borderWidth={1}
      borderRadius="lg"
      opacity={!isConnected ? 0.7 : 1}
    >
      <Heading size={{ base: "sm", md: "md" }} mb={{ base: 3, md: 4 }}>
        Active Sessions ({isConnected ? activeSessions.length : 0})
      </Heading>
      {!isConnected ? (
        <Text>Connect your wallet to view active sessions</Text>
      ) : activeSessions.length === 0 ? (
        <Text>No active sessions</Text>
      ) : (
        <VStack spacing={{ base: 3, md: 4 }} align="stretch">
          {activeSessions.map((session) => (
            <Box
              key={session.topic}
              p={{ base: 3, md: 4 }}
              borderWidth={1}
              borderRadius="md"
            >
              <Flex
                justifyContent="space-between"
                alignItems={{ base: "flex-start", sm: "center" }}
                mb={2}
                direction={{ base: "column", sm: "row" }}
                gap={{ base: 2, sm: 0 }}
              >
                <HStack>
                  {session.peer.metadata.icons &&
                    session.peer.metadata.icons[0] && (
                      <Box
                        as="img"
                        src={session.peer.metadata.icons[0]}
                        alt={session.peer.metadata.name}
                        boxSize={{ base: "24px", md: "32px" }}
                        borderRadius="md"
                        mr={2}
                      />
                    )}
                  <Text fontWeight="bold" fontSize={{ base: "sm", md: "md" }}>
                    {session.peer.metadata.name}
                  </Text>
                </HStack>
                <Button
                  size="sm"
                  colorScheme="red"
                  onClick={() => disconnectSession(session.topic)}
                >
                  Disconnect
                </Button>
              </Flex>
              <Text fontSize="sm" color="gray.600" mb={2}>
                {session.peer.metadata.url}
              </Text>

              <Text fontSize="sm" fontWeight="bold" mb={1}>
                Approved Chains:
              </Text>
              <HStack wrap="wrap" spacing={2}>
                {session.namespaces.eip155?.accounts.map((account: string) => {
                  const [namespace, chainIdStr] = account.split(":");
                  const accountChainId = parseInt(chainIdStr);
                  const chainName =
                    chainIdToChain[accountChainId]?.name || chainIdStr;
                  return (
                    <Badge
                      key={account}
                      colorScheme={
                        accountChainId === chainId ? "green" : "gray"
                      }
                    >
                      {chainName}
                    </Badge>
                  );
                })}
              </HStack>
            </Box>
          ))}
        </VStack>
      )}
    </Box>
  );
}
