"use client";
import { Box, HStack, Progress, Text, Tooltip, VStack } from "@chakra-ui/react";
import { Info } from "lucide-react";
import {
  bytecodeSize,
  formatBytes,
  INITCODE_SIZE_LIMIT,
  RUNTIME_SIZE_LIMIT,
  sizeStatus,
} from "@/lib/solidity/contractSize";
import type { CompiledContract } from "./types";

function SizeRow({
  label,
  bytes,
  limit,
  eip,
  explanation,
  pending = false,
}: {
  label: string;
  bytes: number | null;
  limit: number;
  eip: string;
  explanation: string;
  pending?: boolean;
}) {
  const status = bytes === null ? "normal" : sizeStatus(bytes, limit);
  const color =
    status === "over"
      ? "red.300"
      : status === "near"
        ? "yellow.300"
        : "text.secondary";
  return (
    <Box aria-busy={pending}>
      <HStack justify="space-between" gap={2} mb={1.5} flexWrap="wrap">
        <Tooltip
          label={`${explanation} ${eip} reference limit: ${formatBytes(limit)} bytes. Network limits may differ.`}
          hasArrow
        >
          <HStack
            as="span"
            tabIndex={0}
            spacing={1}
            color="text.tertiary"
            cursor="help"
          >
            <Text fontSize="xs">{label}</Text>
            <Info size={12} />
          </HStack>
        </Tooltip>
        <Text fontSize="xs" color={color} fontFamily="mono" whiteSpace="nowrap">
          {bytes === null
            ? `— / ${formatBytes(limit)} B`
            : `${formatBytes(bytes)} / ${formatBytes(limit)} B`}
        </Text>
      </HStack>
      <Progress
        aria-label={`${label} bytecode size`}
        value={bytes === null ? 0 : Math.min(100, (bytes / limit) * 100)}
        h="3px"
        borderRadius="full"
        bg="whiteAlpha.100"
        colorScheme={
          status === "over" ? "red" : status === "near" ? "yellow" : "blue"
        }
      />
      {bytes !== null && status !== "normal" && (
        <Text role="status" mt={1.5} fontSize="xs" color={color}>
          {status === "over"
            ? `${formatBytes(bytes - limit)} ${bytes - limit === 1 ? "byte" : "bytes"} over ${eip}`
            : `Near the ${eip} limit`}
        </Text>
      )}
    </Box>
  );
}
export function ContractSize({ contract }: { contract: CompiledContract }) {
  return (
    <Box
      as="fieldset"
      minW={0}
      aria-label="Contract bytecode sizes"
      mb={4}
      p={3}
      borderWidth="1px"
      borderColor="border.default"
      borderRadius="lg"
    >
      <Box as="legend" px={2}>
        <Text fontSize="sm" color="text.secondary">
          Contract Size
        </Text>
      </Box>
      <VStack align="stretch" spacing={3} pt={1}>
        <SizeRow
          label="Runtime"
          bytes={bytecodeSize(contract.deployedBytecode)}
          limit={RUNTIME_SIZE_LIMIT}
          eip="EIP-170"
          explanation="Code stored on-chain after deployment."
        />
        <SizeRow
          label="Creation"
          bytes={bytecodeSize(contract.bytecode)}
          limit={INITCODE_SIZE_LIMIT}
          eip="EIP-3860"
          explanation="Compiled deployment code, excluding constructor arguments."
        />
      </VStack>
    </Box>
  );
}
export function InitcodeSize({
  bytes,
  pending,
}: {
  bytes: number | null;
  pending?: boolean;
}) {
  return (
    <Box aria-label="Deployment initcode size" w="full">
      <SizeRow
        label="Initcode"
        bytes={pending ? null : bytes}
        pending={pending}
        limit={INITCODE_SIZE_LIMIT}
        eip="EIP-3860"
        explanation={
          pending
            ? "Calculating deployment code including constructor arguments."
            : bytes === null
              ? "Complete constructor arguments to calculate deployment size."
              : "Deployment code including ABI-encoded constructor arguments."
        }
      />
    </Box>
  );
}
