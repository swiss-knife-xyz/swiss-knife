"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Flex,
  HStack,
  Text,
  Input,
  Spinner,
} from "@chakra-ui/react";
import { TreeBranchHeader } from "@/components/tree/TreeBranchHeader";
import { TraceBadge, callColors } from "./TraceBadge";
import { formatTraceValue } from "@/lib/tracer/format";
import dynamic from "next/dynamic";
import type { TraceDecodeEntry } from "@/lib/tracer/decodingStore";
import { flattenCalls, type TraceCall } from "@/lib/tracer/model";
import { previewArgs } from "@/lib/tracer/preview";
import { getDisplayFunctionName } from "@/utils/functionNames";
const TraceDecodedValues = dynamic(() =>
  import("./TraceDecodedValues").then((module) => module.TraceDecodedValues)
);
const EMPTY_ENTRIES: Record<string, TraceDecodeEntry> = {};

export const shortAddress = (value: string) =>
  `${value.slice(0, 8)}…${value.slice(-4)}`;
export function TraceCallTree({
  root,
  selectedId,
  onSelect,
  entries = EMPTY_ENTRIES,
  onVisibleCalls,
  completed = 0,
  requested = 0,
  chainId,
}: {
  root: TraceCall;
  chainId?: number;
  selectedId: string;
  onSelect: (call: TraceCall, rolledBack: boolean) => void;
  entries?: Record<string, TraceDecodeEntry>;
  onVisibleCalls?: (calls: readonly TraceCall[]) => void;
  completed?: number;
  requested?: number;
}) {
  const [showParameters, setShowParameters] = useState(false);
  const [showLogs, setShowLogs] = useState(true);
  const [query, setQuery] = useState("");
  const [failuresOnly, setFailuresOnly] = useState(false);
  const calls = useMemo(() => flattenCalls(root), [root]);
  const [collapsed, setCollapsed] = useState(
    () =>
      new Set(
        calls
          .filter((call) => call.id.split(".").length > 2)
          .map((call) => call.id)
      )
  );
  const visible = useMemo(() => {
    if (!query && !failuresOnly) return null;
    const ids = new Set<string>();
    const search = query.toLowerCase().trim();
    for (const call of calls) {
      if (
        (!failuresOnly || call.error) &&
        (!search ||
          [
            call.from,
            call.to,
            call.input.slice(0, 10),
            call.type,
            call.error,
            entries[call.id]?.data?.contractName,
            entries[call.id]?.data?.input?.functionName,
            entries[call.id]?.data?.input
              ? previewArgs(entries[call.id].data!.input!.args)
              : "",
            entries[call.id]?.data?.outputs
              ? previewArgs(entries[call.id].data!.outputs!)
              : "",
            entries[call.id]?.data?.revert?.functionName,
          ].some((value) => value?.toLowerCase().includes(search)))
      ) {
        const parts = call.id.split(".");
        while (parts.length) {
          ids.add(parts.join("."));
          parts.pop();
        }
      }
    }
    return ids;
  }, [calls, query, failuresOnly, entries]);
  const visibleCalls = useMemo(
    () =>
      calls
        .filter((call) => {
          if (visible) return visible.has(call.id);
          const parts = call.id.split(".");
          parts.pop();
          while (parts.length) {
            if (collapsed.has(parts.join("."))) return false;
            parts.pop();
          }
          return true;
        })
        .slice(0, 200),
    [calls, visible, collapsed]
  );
  useEffect(() => {
    onVisibleCalls?.(visibleCalls);
  }, [onVisibleCalls, visibleCalls]);
  function toggle(id: string) {
    setCollapsed((previous) => {
      const next = new Set(previous);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function branch(
    call: TraceCall,
    level: number,
    ancestorFailed: boolean
  ): React.ReactNode {
    if (visible && !visible.has(call.id)) return null;
    const rolledBack = ancestorFailed || !!call.error;
    const open = !!visible || !collapsed.has(call.id);
    const entry = entries[call.id];
    const decoded = entry?.data;
    const functionName = decoded?.input
      ? getDisplayFunctionName(
          decoded.input.functionName,
          decoded.input.guessedFunctionName
        ).name
      : undefined;
    const displayedLogs = call.logs.slice(0, 50);
    function logsAt(position?: number) {
      if (!showLogs || (failuresOnly && !call.error)) return null;
      return displayedLogs.map((log, index) => {
        if (log.position !== position) return null;
        const event = decoded?.logs[index];
        return (
          <Box
            key={`log-${index}`}
            px={3}
            py={1.5}
            fontFamily="mono"
            fontSize="xs"
            overflowX="auto"
            whiteSpace="nowrap"
            color={rolledBack ? "orange.300" : "purple.200"}
            data-trace-log={`${call.id}.${index}`}
          >
            <Text as="span" color="text.tertiary" mr={2}>
              emit
            </Text>
            {event
              ? `${event.eventName}(${previewArgs(event.args)})`
              : `${log.topics[0]?.slice(0, 10) ?? "LOG0"}(${log.data === "0x" ? "" : `${log.data.slice(0, 26)}…`})`}
            {log.position === undefined && (
              <Text as="span" color="text.tertiary" ml={2}>
                order unavailable
              </Text>
            )}
          </Box>
        );
      });
    }
    return (
      <Box key={call.id} data-trace-call={call.id} mb={1}>
        <TreeBranchHeader
          id={call.id}
          level={level}
          label={`${call.type} ${call.to ?? "contract creation"}`}
          open={open}
          toggle={toggle}
          onActivate={() => onSelect(call, rolledBack)}
          activationLabel={`Select call ${call.id}`}
          rowHeight={36}
          selected={selectedId === call.id}
          expandable={
            call.calls.length > 0 || call.logs.length > 0 || showParameters
          }
        >
          <TraceBadge color={callColors[call.type]}>{call.type}</TraceBadge>
          <Text
            fontSize="xs"
            fontFamily="mono"
            color="blue.200"
            title={call.to}
          >
            {decoded?.contractName ||
              (call.to ? shortAddress(call.to) : "Contract creation")}
          </Text>
          <Text
            as="span"
            fontSize="xs"
            fontFamily="mono"
            color={functionName ? "green.300" : "text.secondary"}
          >
            {functionName ? (
              <>
                {functionName}
                <Text as="span" color="text.primary">
                  ({previewArgs(decoded!.input!.args)})
                </Text>
              </>
            ) : call.type.startsWith("CREATE") ? (
              "initcode"
            ) : call.input === "0x" ? (
              "call()"
            ) : (
              call.input.slice(0, 10)
            )}
            {decoded?.inputInferred && (
              <Text as="span" color="orange.300" ml={1} title={decoded.note}>
                ~
              </Text>
            )}
            <Text as="span" color={call.error ? "red.300" : "cyan.200"} ml={2}>
              →{" "}
              {call.error
                ? decoded?.revert
                  ? `${decoded.revert.functionName}(${previewArgs(decoded.revert.args)})`
                  : call.revertReason || "revert"
                : decoded?.outputs !== undefined
                  ? `(${previewArgs(decoded.outputs)})`
                  : call.output === "0x"
                    ? "()"
                    : `${call.output.slice(0, 18)}${call.output.length > 18 ? "…" : ""}`}
            </Text>
          </Text>
          {entry?.status === "loading" && (
            <Spinner size="xs" color="text.tertiary" />
          )}
          {call.value && BigInt(call.value) > 0n && (
            <Text fontSize="xs" color="text.secondary" fontFamily="mono">
              {formatTraceValue(call.value, chainId)}
            </Text>
          )}
          {call.error ? (
            <TraceBadge color="red.300">Reverted</TraceBadge>
          ) : ancestorFailed ? (
            <TraceBadge color="orange.300">Rolled back</TraceBadge>
          ) : null}
          {call.gasUsed !== undefined && (
            <Text fontSize="xs" color="text.secondary" fontFamily="mono">
              {BigInt(call.gasUsed).toLocaleString()} gas
            </Text>
          )}
        </TreeBranchHeader>
        {open &&
          (call.calls.length > 0 ||
            (showLogs && call.logs.length > 0) ||
            (showParameters && decoded)) && (
            <Box
              ml={{ base: 1, md: 2 }}
              pl={{ base: 2, md: 3 }}
              borderLeft="1px solid"
              borderColor="whiteAlpha.100"
            >
              {showParameters && decoded && (
                <Box p={3} data-trace-parameters={call.id}>
                  <TraceDecodedValues
                    resolveAddresses={false}
                    call={call}
                    decoded={decoded}
                    chainId={chainId}
                  />
                </Box>
              )}
              {logsAt(0)}
              {call.calls.map((child, index) => (
                <Box key={child.id}>
                  {branch(child, level + 1, rolledBack)}
                  {logsAt(index + 1)}
                </Box>
              ))}
              {logsAt(undefined)}
              {showLogs && call.logs.length > 50 && (
                <Text fontSize="xs" color="text.secondary" px={3} py={1}>
                  +{call.logs.length - 50} logs in call details
                </Text>
              )}
            </Box>
          )}
      </Box>
    );
  }
  const failed = calls.filter((call) => call.error).length;
  return (
    <Box
      minW={0}
      border="1px solid"
      borderColor="border.default"
      borderRadius="md"
      bg="bg.subtle"
    >
      <Flex
        px={3}
        py={2}
        gap={2}
        justify="space-between"
        wrap="wrap"
        borderBottom="1px solid"
        borderColor="border.default"
      >
        <HStack spacing={3}>
          <Text fontSize="sm" fontWeight="medium">
            Call trace
          </Text>
          <Text fontSize="xs" color="text.secondary">
            {calls.length} calls
          </Text>
          <TraceBadge color={root.error ? "red.300" : "green.300"}>
            {root.error ? "Reverted" : "Success"}
          </TraceBadge>
        </HStack>
        <HStack spacing={1} wrap="wrap">
          {requested > completed && (
            <Text fontSize="xs" color="text.secondary">
              Decoding {completed}/{requested}
            </Text>
          )}
          {onVisibleCalls && requested < calls.length && (
            <Button
              size="xs"
              variant="ghost"
              onClick={() => onVisibleCalls(calls)}
            >
              Decode all
            </Button>
          )}
          <Button
            size="xs"
            variant="ghost"
            aria-pressed={showParameters}
            color={showParameters ? "blue.300" : "text.secondary"}
            onClick={() => setShowParameters((value) => !value)}
          >
            Parameters
          </Button>
          <Button
            size="xs"
            variant="ghost"
            aria-pressed={showLogs}
            color={showLogs ? "purple.200" : "text.secondary"}
            onClick={() => setShowLogs((value) => !value)}
          >
            Logs
          </Button>
          {failed > 0 && (
            <Button
              size="xs"
              variant="ghost"
              aria-pressed={failuresOnly}
              color="red.300"
              bg={failuresOnly ? "red.900" : undefined}
              onClick={() => setFailuresOnly((value) => !value)}
            >
              {failed} reverted
            </Button>
          )}
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setCollapsed(new Set())}
          >
            Expand all
          </Button>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setCollapsed(new Set(calls.map((call) => call.id)))}
          >
            Collapse all
          </Button>
        </HStack>
      </Flex>
      <Box px={3} pt={3}>
        <Input
          aria-label="Search calls"
          size="sm"
          placeholder="Search address, function or selector"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          fontSize="xs"
        />
      </Box>
      <Box px={2} py={2} maxH="72vh" overflowY="auto">
        {visible?.size === 0 ? (
          <Text p={4} color="text.secondary" fontSize="sm">
            No matching calls.
          </Text>
        ) : (
          branch(root, 0, false)
        )}
      </Box>
    </Box>
  );
}
