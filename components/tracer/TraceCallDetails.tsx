"use client";
import { useState } from "react";
import {
  Box,
  Button,
  Heading,
  HStack,
  Text,
  Tooltip,
  Textarea,
  FormControl,
  FormLabel,
  Spinner,
} from "@chakra-ui/react";
import { InfoOutlineIcon } from "@chakra-ui/icons";
import type { InterfaceAbi } from "ethers";
import { TraceBadge, callColors } from "./TraceBadge";
import { TraceData as Raw } from "./TraceData";
import { formatTraceValue } from "@/lib/tracer/format";
import { CalldataTree } from "@/components/decodedParams/CalldataTree";
import { TraceDecodedValues } from "./TraceDecodedValues";
import type { TraceCall } from "@/lib/tracer/model";
import type { TraceDecodeEntry } from "@/lib/tracer/decodingStore";
import { traceCodeAddress } from "@/lib/tracer/codeAddress";

export default function TraceCallDetails({
  call,
  chainId,
  rolledBack,
  entry,
  onAbi,
}: {
  call: TraceCall;
  chainId?: number;
  rolledBack: boolean;
  entry?: TraceDecodeEntry;
  onAbi: (address: string, abi: InterfaceAbi) => Promise<void>;
}) {
  const decoded = entry?.data;
  const [raw, setRaw] = useState(false);
  const [showAbi, setShowAbi] = useState(false);
  const [abiText, setAbiText] = useState("");
  const [abiError, setAbiError] = useState("");
  const [applying, setApplying] = useState(false);
  const [logLimit, setLogLimit] = useState(50);
  const codeAddress = decoded?.codeAddress ?? traceCodeAddress(call);
  const pending =
    !entry || entry.status === "queued" || entry.status === "loading";
  async function applyAbi() {
    if (!codeAddress) return;
    setApplying(true);
    setAbiError("");
    try {
      const { parseContractAbi } = await import("@/lib/contractAbi");
      await onAbi(codeAddress, parseContractAbi(abiText));
      setShowAbi(false);
    } catch (error) {
      setAbiError(error instanceof Error ? error.message : "Invalid ABI");
    } finally {
      setApplying(false);
    }
  }
  return (
    <Box
      border="1px solid"
      borderColor="border.default"
      borderRadius="md"
      p={4}
      minW={0}
      bg="bg.subtle"
      maxH={{ xl: "calc(100dvh - 32px)" }}
      overflowY={{ xl: "auto" }}
    >
      <HStack justify="space-between" mb={3} wrap="wrap">
        <Heading as="h2" fontSize="md">
          Call{" "}
          <Text as="span" fontFamily="mono" color="text.secondary">
            {call.id}
          </Text>
        </Heading>
        <TraceBadge
          color={
            call.error ? "red.300" : rolledBack ? "orange.300" : "green.300"
          }
        >
          {call.error ? "Reverted" : rolledBack ? "Rolled back" : "Success"}
        </TraceBadge>
      </HStack>
      <Box display="grid" gap={3}>
        <HStack spacing={2}>
          <TraceBadge color={callColors[call.type]}>{call.type}</TraceBadge>
          <Text fontSize="xs" color="text.secondary">
            {call.gasUsed ? `${BigInt(call.gasUsed).toLocaleString()} gas` : ""}
          </Text>
          {call.value !== undefined && (
            <Text fontSize="xs" color="green.300" ml="auto">
              {formatTraceValue(call.value, chainId)}
            </Text>
          )}
        </HStack>
        {decoded?.contractName && (
          <Text fontSize="sm" color="blue.200">
            {decoded.contractName}
          </Text>
        )}
        <Raw label="From" value={call.from} color="blue.200" />
        <Raw label="To" value={call.to ?? "—"} color="blue.200" />
        {codeAddress &&
          codeAddress.toLowerCase() !== call.to?.toLowerCase() && (
            <Raw
              label="Executed implementation"
              value={codeAddress}
              color="orange.200"
            />
          )}
        {rolledBack && (
          <Text fontSize="sm" color={call.error ? "red.300" : "orange.300"}>
            {call.revertReason || call.error || "Rolled back by parent call."}
          </Text>
        )}
        <HStack justify="space-between">
          <HStack spacing={1}>
            <Button
              size="xs"
              variant="ghost"
              aria-pressed={!raw}
              color={!raw ? "blue.300" : "text.secondary"}
              onClick={() => setRaw(false)}
            >
              Decoded
            </Button>
            <Button
              size="xs"
              variant="ghost"
              aria-pressed={raw}
              color={raw ? "blue.300" : "text.secondary"}
              onClick={() => setRaw(true)}
            >
              Raw
            </Button>
            {codeAddress && (
              <Button
                size="xs"
                variant="ghost"
                aria-expanded={showAbi}
                onClick={() => setShowAbi((value) => !value)}
              >
                ABI
              </Button>
            )}
          </HStack>
          {decoded && (
            <Tooltip label={decoded.note} hasArrow>
              <span tabIndex={0} aria-label="About decoding">
                <InfoOutlineIcon color="text.secondary" boxSize={3} />
              </span>
            </Tooltip>
          )}
        </HStack>
        {showAbi && (
          <Box display="grid" gap={2}>
            <FormControl>
              <FormLabel htmlFor="trace-abi" fontSize="xs">
                ABI or function declaration
              </FormLabel>
              <Textarea
                id="trace-abi"
                value={abiText}
                onChange={(event) => setAbiText(event.target.value)}
                rows={4}
                fontFamily="mono"
                fontSize="xs"
                placeholder="function transfer(address to, uint256 value) returns (bool)"
              />
            </FormControl>
            <Button
              size="sm"
              variant="outline"
              isLoading={applying}
              isDisabled={!abiText.trim()}
              onClick={applyAbi}
            >
              Apply to contract
            </Button>
            {abiError && (
              <Text fontSize="xs" color="red.300" role="alert">
                {abiError}
              </Text>
            )}
          </Box>
        )}
        {raw ? (
          <>
            <Raw
              label={call.type.startsWith("CREATE") ? "Initcode" : "Input"}
              value={call.input}
            />
            <Raw
              label={
                call.error
                  ? "Revert data"
                  : call.type.startsWith("CREATE")
                    ? "Deployed bytecode"
                    : "Output"
              }
              value={call.output}
            />
          </>
        ) : decoded ? (
          <TraceDecodedValues call={call} decoded={decoded} chainId={chainId} />
        ) : pending ? (
          <HStack color="text.secondary">
            <Spinner size="xs" />
            <Text fontSize="xs">Decoding…</Text>
          </HStack>
        ) : (
          <>
            <Text fontSize="xs" color="text.secondary">
              {entry?.error ?? "No matching ABI"}
            </Text>
            <Raw label="Input" value={call.input} />
            <Raw label="Output" value={call.output} />
          </>
        )}
        <Heading as="h3" fontSize="sm">
          Logs ({call.logs.length})
        </Heading>
        {call.logs.slice(0, logLimit).map((log, index) => (
          <Box key={index}>
            <Text
              fontSize="xs"
              color={rolledBack ? "orange.300" : "text.secondary"}
              mb={1}
            >
              Log {index}
              {rolledBack ? " · rolled back" : ""}
            </Text>
            {!raw && decoded?.logs[index] ? (
              <CalldataTree
                rawUnitLabel="Raw"
                args={decoded.logs[index].args}
                functionName={decoded.logs[index].eventName}
                chainId={chainId}
                showControls={false}
              />
            ) : (
              <Raw
                label={`Log ${index} data`}
                value={JSON.stringify(log, null, 2)}
              />
            )}
          </Box>
        ))}
        {call.logs.length > 200 && (
          <Text fontSize="xs" color="text.secondary">
            First 200 logs decoded
          </Text>
        )}
        {logLimit < call.logs.length && (
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setLogLimit((value) => value + 50)}
          >
            Show more logs
          </Button>
        )}
      </Box>
    </Box>
  );
}
