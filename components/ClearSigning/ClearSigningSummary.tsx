"use client";

import { useContext, useEffect, useState } from "react";
import {
  Box,
  Divider,
  HStack,
  IconButton,
  Link,
  Text,
  Tooltip,
  VStack,
} from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { formatUnits, isAddress, parseAbi } from "viem";
import { ExampleSnapshotContext } from "@/components/decodedParams/ExampleSnapshotContext";
import { NestedCallData } from "./NestedCallData";
import { clearSigningRequestKey } from "@/lib/clearSigning/requestKey";
import { CopyToClipboard } from "@/components/CopyToClipboard";
import { chainIdToChain, getNetworkName } from "@/data/networks";
import { getPath } from "@/utils";
import { getPublicClient } from "@/lib/publicClient";
import { GNS_NAME_NFT_ADDRESS } from "@/lib/nameServiceContracts";
import { resolveAddressToName } from "@/lib/nameResolution";
import subdomains from "@/subdomains";
import { useCustomChains } from "@/lib/customChains/store";
import {
  resolveClearSigning,
  type ClearSigningRequest,
  type ClearSigningResult,
} from "@/lib/clearSigning/resolve";
import type {
  RenderedField,
  RenderedValue,
} from "@/lib/clearSigning/applyFormat";

export default function ClearSigningSummary(
  props: ClearSigningRequest & { depth?: number }
) {
  const saved = useCustomChains();
  // Remount before painting a different payload or RPC configuration. A late
  // descriptor/metadata response can never decorate another decoded request.
  return (
    <SummaryContent
      key={JSON.stringify([props, saved.revision, saved.ready])}
      {...props}
      ready={saved.ready}
    />
  );
}

function SummaryContent({
  depth = 0,
  ready,
  ...request
}: ClearSigningRequest & { depth?: number; ready: boolean }) {
  const example = useContext(ExampleSnapshotContext);
  const [result, setResult] = useState<ClearSigningResult | null | undefined>(
    () => example ? example.clearSigning?.[clearSigningRequestKey(request)] ?? null : undefined
  );
  useEffect(() => {
    if (example || !ready || depth > 3) return;
    let cancelled = false;
    resolveClearSigning(request)
      .then((value) => {
        if (!cancelled) setResult(value);
      })
      .catch(() => { if (!cancelled) setResult(null); });
    return () => {
      cancelled = true;
    };
  }, [ready]); // The keyed parent binds this instance to exactly one request.

  if (!result) return depth && (result === null || depth > 3) ? <RawCall request={request} /> : null;
  const sourceHref = result.sourcePath
    ? `https://github.com/ethereum/clear-signing-erc7730-registry/blob/master/${result.sourcePath}`
    : undefined;
  return (
    <Box
      as="section"
      aria-label="Clear signing"
      mb={0}
      p={depth ? 0 : 4}
      w="full"
      maxW={depth ? "full" : "640px"}
      mx={depth ? 0 : "auto"}
      bg={depth ? "transparent" : "bg.subtle"}
      border={depth ? "none" : "1px solid"}
      borderColor="border.default"
      borderRadius="lg"
      minW={0}
    >
      <HStack justify="space-between" align="baseline" spacing={3} mb={3}>
        <Text fontSize="md" fontWeight="semibold" lineHeight="short" minW={0}>
          {result.intent}
        </Text>
        {sourceHref ? (
          <Link
            href={sourceHref}
            isExternal
            fontSize="xs"
            color="text.tertiary"
            flexShrink={0}
          >
            via {result.owner || "ERC-7730"} ↗
          </Link>
        ) : (
          <Text fontSize="xs" color="text.tertiary" flexShrink={0}>
            via {result.owner || "Standard format"}
          </Text>
        )}
      </HStack>
      <Divider borderColor="border.default" mb={3} />
      <Fields fields={result.fields} chainId={request.chainId} depth={depth} />
    </Box>
  );
}

function Fields({
  fields,
  chainId,
  depth,
}: {
  fields: RenderedField[];
  chainId?: number;
  depth: number;
}) {
  return (
    <VStack align="stretch" spacing={3}>
      {fields.map((field, index) => (
        <Box key={index} minW={0}>
          {field.groups?.length ? (
            <VStack align="stretch" spacing={5}>
              {field.groups.map((group, i) => (
                <Box key={i} minW={0}>
                  {field.groups!.length > 1 && <CallSectionHeading index={i} total={field.groups!.length} label={field.label || "Item"} />}
                  <Fields fields={group} chainId={chainId} depth={depth} />
                </Box>
              ))}
            </VStack>
          ) : field.values.length > 0 && field.values.every(value => value.kind === "calldata") ? (
            <VStack align="stretch" spacing={5}>
              {field.values.length === 1 && <Text fontSize="xs" color="text.secondary" fontWeight="medium">{field.label}</Text>}
              {field.values.map((value, i) => (
                <Box key={i} minW={0}>
                  {field.values.length > 1 && <CallSectionHeading index={i} total={field.values.length} label={field.label || "Call"} />}
                  <Value value={value} chainId={chainId} depth={depth} />
                </Box>
              ))}
            </VStack>
          ) : (
            <Box
              display="flex"
              flexDirection={
                field.values.some(
                  (v) =>
                    v.kind === "amount" ||
                    v.kind === "tokenAmount" ||
                    v.kind === "calldata"
                )
                  ? "column"
                  : "row"
              }
              gap={
                field.values.some(
                  (v) => v.kind === "amount" || v.kind === "tokenAmount"
                )
                  ? 1
                  : 3
              }
              justifyContent="space-between"
              alignItems="start"
              minW={0}
            >
              <Text
                fontSize="xs"
                fontWeight="medium"
                color="text.secondary"
                flexShrink={0}
                pt="1px"
              >
                {field.label}
              </Text>
              <VStack
                align="end"
                spacing={1}
                minW={0}
                maxW="full"
                flex={1}
                w="full"
              >
                {field.values.map((value, i) => (
                  <Value
                    key={i}
                    value={value}
                    chainId={chainId}
                    depth={depth}
                  />
                ))}
              </VStack>
            </Box>
          )}
        </Box>
      ))}
    </VStack>
  );
}

function CallSectionHeading({ index, total, label }: { index: number; total: number; label: string }) {
  return (
    <HStack spacing={2} mb={3}>
      <Text fontSize="xs" fontWeight="bold" color="gray.900" bg="blue.300" px={2} py={0.5} borderRadius="full" flexShrink={0}>
        {index + 1} / {total}
      </Text>
      <Text fontSize="xs" fontWeight="semibold" letterSpacing="0.08em" textTransform="uppercase" color="text.secondary">{label}</Text>
      <Divider flex={1} borderColor="border.default" />
    </HStack>
  );
}

function AddressValue({
  address,
  chainId,
}: {
  address: string;
  chainId?: number;
}) {
  const example = useContext(ExampleSnapshotContext);
  const [name, setName] = useState<string | null>(
    () =>
      example?.addresses[`${chainId}:${address.toLowerCase()}`]?.labels[0] ??
      null
  );
  useEffect(() => {
    if (example) return;
    let cancelled = false;
    resolveAddressToName(address).then((value) => {
      if (!cancelled) setName(value);
    });
    return () => {
      cancelled = true;
    };
  }, [address]);
  const href = `${getPath(subdomains.CONTRACT.base)}${chainId ? `${chainId}/${address}` : `?address=${address}`}`;
  return (
    <HStack minW={0} spacing={1}>
      <Tooltip label={address}>
        <Link
          href={href}
          isExternal
          color="text.primary"
          _hover={{ color: "primary.300", textDecoration: "underline" }}
          fontSize="xs"
          fontFamily={name ? undefined : "mono"}
          overflowWrap="anywhere"
        >
          {name || `${address.slice(0, 6)}…${address.slice(-4)}`}
        </Link>
      </Tooltip>
      <CopyToClipboard
        textToCopy={address}
        aria-label="Copy address"
        size="xs"
        minW={6}
        h={6}
        p={0}
        color="text.tertiary"
        sx={{ "& svg": { width: "12px", height: "12px" } }}
      />
      <Tooltip label="Open in Contract Explorer">
        <IconButton
          as={Link}
          href={href}
          isExternal
          aria-label="Open in Contract Explorer"
          icon={<ExternalLinkIcon boxSize={3} />}
          size="xs"
          variant="ghost"
          minW={6}
          h={6}
          p={0}
          color="text.tertiary"
          _hover={{ color: "text.primary", bg: "whiteAlpha.100" }}
        />
      </Tooltip>
    </HStack>
  );
}

function AmountValue({
  value,
  chainId,
}: {
  value: Extract<RenderedValue, { kind: "amount" | "tokenAmount" }>;
  chainId?: number;
}) {
  const network = chainId ? chainIdToChain[chainId] : undefined;
  const native = value.kind === "amount" || value.native;
  const metadata =
    value.kind === "tokenAmount" ? value.tokenMetadata : undefined;
  const decimals =
    metadata?.decimals ??
    (native
      ? value.kind === "amount"
        ? (value.decimals ?? network?.nativeCurrency.decimals)
        : network?.nativeCurrency.decimals
      : undefined);
  const symbol =
    metadata?.symbol ?? (native ? network?.nativeCurrency.symbol : undefined);
  const unlimited =
    value.kind === "tokenAmount" &&
    value.allowUnlimited !== false &&
    [((1n << 256n) - 1n).toString(), ((1n << 160n) - 1n).toString()].includes(
      value.amountRaw
    );
  const amount =
    decimals !== undefined
      ? formatUnits(BigInt(value.amountRaw), decimals)
      : value.amountRaw;
  const threshold =
    value.kind === "tokenAmount" &&
    value.thresholdRaw !== undefined &&
    BigInt(value.amountRaw) >= BigInt(value.thresholdRaw)
      ? value.thresholdMessage
      : undefined;
  return (
    <VStack align="end" spacing={0.5} minW={0} maxW="full">
      <Tooltip
        label={`${amount}${symbol ? ` ${symbol}` : " base units"} · Raw: ${value.amountRaw}`}
      >
        <Text
          fontSize="lg"
          fontWeight="semibold"
          lineHeight="short"
          textAlign="right"
          sx={{ fontVariantNumeric: "tabular-nums" }}
          overflowWrap="anywhere"
          tabIndex={0}
        >
          {threshold || (unlimited ? "Unlimited" : compactAmount(amount))}
          {!threshold && !unlimited
            ? ` ${symbol || "base units"}`
            : symbol
              ? ` ${symbol}`
              : ""}
        </Text>
      </Tooltip>
      {value.kind === "tokenAmount" && value.tokenAddress && (
        <AddressValue address={value.tokenAddress} chainId={chainId} />
      )}
    </VStack>
  );
}

function Value({
  value,
  chainId: fallbackChainId,
  depth,
}: {
  value: RenderedValue;
  chainId?: number;
  depth: number;
}) {
  const chainId =
    "chainId" in value ? (value.chainId ?? fallbackChainId) : fallbackChainId;
  if (value.kind === "calldata") {
    const request = {
      calldata: value.data,
      to: value.callee,
      chainId,
      value: value.amount,
      from: value.from,
    };
    return depth < 3 ? (
      <ClearSigningSummary {...request} depth={depth + 1} />
    ) : (
      <RawCall request={request} />
    );
  }
  if (value.kind === "gweiName")
    return <GweiNameValue tokenId={value.tokenId} chainId={chainId} />;
  if (value.kind === "address")
    return <AddressValue address={value.address} chainId={chainId} />;
  if (value.kind === "amount" || value.kind === "tokenAmount")
    return <AmountValue value={value} chainId={chainId} />;
  if (value.kind === "tokenTicker")
    return (
      <HStack>
        <Text>{value.tokenMetadata?.symbol}</Text>
        <AddressValue address={value.tokenAddress} chainId={chainId} />
      </HStack>
    );
  let text = "";
  switch (value.kind) {
    case "raw":
    case "enum":
    case "unit":
      text = value.text;
      break;
    case "date":
      text = Number.isFinite(value.timestamp)
        ? new Date(value.timestamp * 1000).toLocaleString(undefined, {
            timeZoneName: "short",
          })
        : String(value.timestamp);
      break;
    case "duration":
      text = `${Math.floor(value.seconds / 3600)}h ${Math.floor((value.seconds % 3600) / 60)}m ${value.seconds % 60}s`;
      break;
    case "chainId":
      text = value.text || getNetworkName(value.chainId, String(value.chainId));
      break;
    case "contentHash":
      text = value.uri || value.raw;
      break;
    case "missing":
      text = "Unavailable";
      break;
  }
  return (
    <Text fontSize="sm" overflowWrap="anywhere" minW={0}>
      {text}
    </Text>
  );
}

function RawCall({ request }: { request: ClearSigningRequest }) {
  return (
    <VStack
      align="stretch"
      spacing={2}
      borderLeft="1px solid"
      borderColor="border.default"
      pl={3}
      minW={0}
    >
      {request.to && isAddress(request.to) && (
        <HStack justify="space-between" spacing={3}>
          <Text fontSize="xs" color="text.secondary" fontWeight="medium">To</Text>
          <AddressValue address={request.to} chainId={request.chainId} />
        </HStack>
      )}
      {request.value && request.value !== "0" && (
        <HStack justify="space-between" spacing={3}>
          <Text fontSize="xs" color="text.secondary" fontWeight="medium">Value</Text>
          <AmountValue value={{ kind: "amount", amountRaw: request.value }} chainId={request.chainId} />
        </HStack>
      )}
      <NestedCallData request={request} />
    </VStack>
  );
}

const gnsNameAbi = parseAbi([
  "function getFullName(uint256 tokenId) view returns (string)",
]);
function GweiNameValue({
  tokenId,
  chainId,
}: {
  tokenId: string;
  chainId?: number;
}) {
  const example = useContext(ExampleSnapshotContext);
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    if (example) return;
    let cancelled = false;
    if (chainId !== 1 && chainId !== 11155111) return;
    (async () => {
      try {
        const resolved = await getPublicClient(chainId, {
          timeout: 4000,
        }).readContract({
          address: GNS_NAME_NFT_ADDRESS,
          abi: gnsNameAbi,
          functionName: "getFullName",
          args: [BigInt(tokenId)],
        });
        if (!cancelled && resolved) setName(resolved);
      } catch {
        /* Keep the original token ID when the name cannot be read. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tokenId, chainId]);
  return (
    <Text fontSize="sm" overflowWrap="anywhere">
      {name || `Name token #${tokenId}`}
    </Text>
  );
}

export function compactAmount(amount: string): string {
  const [integer, fraction = ""] = amount.split(".");
  const whole = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const decimals = fraction.slice(0, 8).replace(/0+$/, "");
  if (!decimals && /^-?0$/.test(integer) && /[1-9]/.test(fraction)) {
    return integer.startsWith("-") ? "> −0.00000001" : "< 0.00000001";
  }
  return decimals ? `${whole}.${decimals}` : whole;
}
