"use client";
import { useEffect, useState, type SyntheticEvent } from "react";
import { Box, HStack, Spinner, Text, VStack } from "@chakra-ui/react";
import { CopyToClipboard } from "@/components/CopyToClipboard";
import type { AbiParameter } from "viem";
import type {
  DeploymentBuild,
  DeploymentRecord,
} from "@/lib/solidity/deployments";
import { stringifyConstructorValues } from "@/lib/solidity/constructorArguments";
import { loadDeploymentConstructor } from "@/lib/solidity/deploymentConstructor";
export function DeploymentConstructorArguments({
  record,
  getBuild,
}: {
  record: DeploymentRecord;
  getBuild(id: string): Promise<DeploymentBuild>;
}) {
  const [open, setOpen] = useState(false);
  const [decoded, setDecoded] = useState<{
    inputs: readonly AbiParameter[];
    values: readonly unknown[];
  }>();
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!open || !record.imported) return;
    const controller = new AbortController();
    setLoading(true);
    void loadDeploymentConstructor(
      record,
      getBuild,
      AbortSignal.any([controller.signal, AbortSignal.timeout(25000)])
    )
      .then((result) => {
        if (!controller.signal.aborted) setDecoded(result);
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [
    open,
    record.id,
    record.constructorInputs,
    record.constructorArgs,
    record.imported,
    getBuild,
  ]);
  return (
    <Box
      as="details"
      onToggle={(event: SyntheticEvent<HTMLDetailsElement>) => {
        if (event.target === event.currentTarget)
          setOpen((event.currentTarget as HTMLDetailsElement).open);
      }}
    >
      <Box as="summary" color="text.secondary" cursor="pointer">
        Constructor arguments
      </Box>
      {open && (
        <>
          {loading ? (
            <HStack mt={2} fontSize="xs" color="text.secondary">
              <Spinner size="xs" />
              <Text>Decoding…</Text>
            </HStack>
          ) : decoded ? (
            <VStack align="stretch" spacing={3} mt={3}>
              {decoded.inputs.map((input, index) => {
                const name = input.name || `param_${index}`;
                const value = decoded.values[index];
                const text =
                  typeof value === "string" || typeof value === "bigint"
                    ? String(value)
                    : stringifyConstructorValues(value, 2);
                return (
                  <Box key={index} minW={0}>
                    <HStack
                      justify="space-between"
                      align="start"
                      spacing={2}
                      mb={1}
                    >
                      <Text
                        fontSize="xs"
                        color="text.secondary"
                        minW={0}
                        overflowWrap="anywhere"
                      >
                        {name}{" "}
                        <Text as="span" color="text.tertiary">
                          ({input.type})
                        </Text>
                      </Text>
                      <CopyToClipboard
                        aria-label={`Copy ${name}`}
                        textToCopy={text}
                        size="xs"
                        h={6}
                        minW={6}
                        px={1}
                        flexShrink={0}
                      />
                    </HStack>
                    <Box
                      as="pre"
                      fontFamily="mono"
                      fontSize="xs"
                      whiteSpace="pre-wrap"
                      overflowWrap="anywhere"
                    >
                      {text}
                    </Box>
                  </Box>
                );
              })}
            </VStack>
          ) : (
            <>
              {record.imported && (
                <Text fontSize="xs" color="text.secondary" mt={2}>
                  Couldn’t decode with the verified ABI. Encoded arguments:
                </Text>
              )}
              <Box
                as="pre"
                mt={2}
                whiteSpace="pre-wrap"
                overflowWrap="anywhere"
                fontFamily="mono"
              >
                {JSON.stringify(JSON.parse(record.arguments), null, 2)}
              </Box>
            </>
          )}
        </>
      )}
    </Box>
  );
}
