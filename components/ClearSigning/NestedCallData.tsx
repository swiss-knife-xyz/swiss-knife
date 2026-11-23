"use client";

import dynamic from "next/dynamic";
import { useContext, useEffect, useState } from "react";
import { Box, Button, HStack, Text } from "@chakra-ui/react";
import { ChevronDownIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { ExampleSnapshotContext } from "@/components/decodedParams/ExampleSnapshotContext";
import type { Arg, DecodeBytesParamResult, DecodeRecursiveResult } from "@/types";
import type { ClearSigningRequest } from "@/lib/clearSigning/resolve";

const CalldataTree = dynamic(() => import("@/components/decodedParams/CalldataTree").then((module) => module.CalldataTree), { ssr: false });

function cachedCall(args: Arg[], data: string): DecodeRecursiveResult {
  for (const arg of args) {
    const decoded = (arg.value as DecodeBytesParamResult)?.decoded;
    if (typeof arg.rawValue === "string" && arg.rawValue.toLowerCase() === data.toLowerCase() && decoded) return decoded;
    const children = Array.isArray(arg.value) ? arg.value as Arg[] : decoded?.args;
    const found = children && cachedCall(children, data);
    if (found) return found;
  }
  return null;
}

/** A readable disclosure for calls that have no clear-signing descriptor. */
export function NestedCallData({ request }: { request: ClearSigningRequest }) {
  const example = useContext(ExampleSnapshotContext);
  const [result, setResult] = useState<DecodeRecursiveResult>(() => cachedCall(example?.result?.args ?? [], request.calldata));
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (example || request.calldata.length < 10) return;
    let cancelled = false;
    import("@/lib/decoder").then(({ decodeRecursive }) => decodeRecursive({
      calldata: request.calldata,
      address: request.to,
      chainId: request.chainId,
    })).then((decoded) => { if (!cancelled) setResult(decoded); }).catch(() => {});
    return () => { cancelled = true; };
  }, [example, request.calldata, request.to, request.chainId]);
  const label = result?.functionName || request.calldata.slice(0, 10) || "0x";
  return (
    <Box minW={0}>
      <HStack justify="space-between" spacing={3}>
        <Text fontSize="xs" color="text.secondary" fontWeight="medium">Calldata</Text>
        <Button size="xs" variant="ghost" h="auto" py={1} px={1}
          aria-label={`${expanded ? "Hide" : "Show"} ${label} calldata`}
          aria-expanded={expanded} onClick={() => setExpanded(!expanded)}
          rightIcon={expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}>
          <Text as="span" fontFamily="mono" fontSize="xs" bg="blue.300" color="gray.900"
            borderRadius="full" px={2} py={0.5} maxW="220px" isTruncated>
            {label}
          </Text>
        </Button>
      </HStack>
      {expanded && <Box mt={3} minW={0} overflowX="auto">
        {result ? <CalldataTree args={result.args} chainId={request.chainId} showControls={false} /> : (
          <Text fontFamily="mono" fontSize="xs" overflowWrap="anywhere">{request.calldata}</Text>
        )}
      </Box>}
    </Box>
  );
}
