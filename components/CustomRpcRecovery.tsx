"use client";

import { useState, useSyncExternalStore } from "react";
import { Box, Button, Flex, Text } from "@chakra-ui/react";
import { getRpcUrlsForChain } from "@/data/networks";
import { removeCustomChain, useCustomChains } from "@/lib/customChains/store";
import {
  clearCustomRpcFailure,
  getCustomRpcFailures,
  getServerCustomRpcFailures,
  subscribeCustomRpcFailures,
} from "@/lib/customChains/failures";
import { CustomChainModal } from "./CustomChainModal";

export function CustomRpcRecovery() {
  const saved = useCustomChains();
  const failures = useSyncExternalStore(
    subscribeCustomRpcFailures,
    getCustomRpcFailures,
    getServerCustomRpcFailures
  );
  const [editing, setEditing] = useState<number>();
  const [resetting, setResetting] = useState<number>();
  const [error, setError] = useState("");
  const visible = failures.flatMap((failure) => {
    const chain = saved.chains.find(
      (chain) => chain.id === failure.chainId && chain.rpcUrl === failure.rpcUrl
    );
    return chain ? [{ ...failure, chain }] : [];
  });
  if (!visible.length && editing === undefined) return null;
  return (
    <Box mb={4}>
      {visible.map(({ chain, reason }) => (
        <Flex
          key={chain.id}
          role="alert"
          p={3}
          mb={2}
          gap={3}
          align="center"
          wrap="wrap"
          border="1px solid"
          borderColor="orange.700"
          bg="bg.subtle"
          borderRadius="md"
        >
          <Box flex="1" minW="180px">
            <Text fontSize="sm" color="orange.200">
              {reason === "access"
                ? "Custom RPC access denied"
                : reason === "rate-limit"
                  ? "Custom RPC rate limit reached"
                  : "Custom RPC unreachable"}
              : {chain.name}
            </Text>
            <Text fontSize="xs" color="text.secondary">
              {new URL(chain.rpcUrl).host}
            </Text>
          </Box>
          <Flex gap={2} wrap="wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setError("");
                setEditing(chain.id);
              }}
            >
              Edit RPC
            </Button>
            {getRpcUrlsForChain(chain.id, "public").length > 0 && (
              <Button
                size="sm"
                colorScheme="blue"
                isLoading={resetting === chain.id}
                isDisabled={resetting !== undefined}
                onClick={async () => {
                  setResetting(chain.id);
                  setError("");
                  try {
                    await removeCustomChain(chain.id);
                    clearCustomRpcFailure(chain.id);
                  } catch {
                    setError("Could not restore the public RPC. Try again.");
                  } finally {
                    setResetting(undefined);
                  }
                }}
              >
                Use public RPC
              </Button>
            )}
          </Flex>
        </Flex>
      ))}
      {error && (
        <Text role="alert" color="red.300" fontSize="sm">
          {error}
        </Text>
      )}
      <CustomChainModal
        isOpen={editing !== undefined}
        initialChainId={editing}
        onClose={() => setEditing(undefined)}
        onSaved={(chain) => {
          clearCustomRpcFailure(chain.id);
          setEditing(undefined);
        }}
      />
    </Box>
  );
}
