"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Flex,
  HStack,
  Text,
  Input,
  Spinner,
  Switch,
} from "@chakra-ui/react";
import { TreeBranchHeader } from "@/components/tree/TreeBranchHeader";
import { TraceBadge, callColors } from "./TraceBadge";
import { formatTraceValue } from "@/lib/tracer/format";
import dynamic from "next/dynamic";
import type { TraceDecodeEntry } from "@/lib/tracer/decodingStore";
import { flattenCalls, type TraceCall } from "@/lib/tracer/model";
import { previewArgs } from "@/lib/tracer/preview";
import { getDisplayFunctionName } from "@/utils/functionNames";
import { tracePrecompile } from "@/lib/tracer/precompiles";
import { FiMaximize2, FiMinimize2 } from "react-icons/fi";
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
  defaultExpanded = false,
}: {
  root: TraceCall;
  chainId?: number;
  selectedId: string;
  onSelect: (call: TraceCall, rolledBack: boolean) => void;
  entries?: Record<string, TraceDecodeEntry>;
  onVisibleCalls?: (calls: readonly TraceCall[]) => void;
  completed?: number;
  requested?: number;
  defaultExpanded?: boolean;
}) {
  const [showParameters, setShowParameters] = useState(false);
  const [showStaticCalls, setShowStaticCalls] = useState(true);
  const [query, setQuery] = useState("");
  const [failuresOnly, setFailuresOnly] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const expandedContent = useRef(new Map<string, HTMLDivElement>());
  const pendingReveal = useRef<string | null>(null);
  const calls = useMemo(() => flattenCalls(root), [root]);
  const shownCalls = useMemo(() => {
    if (showStaticCalls) return calls;
    const result: TraceCall[] = [];
    function visit(call: TraceCall) {
      if (call.type === "STATICCALL") return;
      result.push(call);
      call.calls.forEach(visit);
    }
    visit(root);
    return result;
  }, [calls, root, showStaticCalls]);
  const [collapsed, setCollapsed] = useState(
    () =>
      new Set(
        (defaultExpanded ? [] : calls)
          .filter((call) => call.id.split(".").length > 2)
          .map((call) => call.id)
      )
  );
  const visible = useMemo(() => {
    if (!query && !failuresOnly) return null;
    const ids = new Set<string>();
    const search = query.toLowerCase().trim();
    for (const call of shownCalls) {
      if (
        (!failuresOnly || call.error) &&
        (!search ||
          [
            call.from,
            call.to,
            call.input.slice(0, 10),
            call.type,
            call.error,
            tracePrecompile(call) ? "Precompiled" : "",
            tracePrecompile(call),
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
  }, [shownCalls, query, failuresOnly, entries]);
  const visibleCalls = useMemo(
    () =>
      shownCalls
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
    [shownCalls, visible, collapsed]
  );
  useEffect(() => {
    onVisibleCalls?.(visibleCalls);
  }, [onVisibleCalls, visibleCalls]);
  useEffect(() => {
    const id = pendingReveal.current;
    pendingReveal.current = null;
    if (!id) return;
    const frame = requestAnimationFrame(() => {
      const container = scrollRef.current;
      const content = expandedContent.current.get(id);
      if (!container || !content) return;
      const bounds = container.getBoundingClientRect();
      const rect = content.getBoundingClientRect();
      // Leave room for the sticky ancestry above the newly revealed children.
      const margin = id.split(".").length * 36 + 8;
      const top = Math.max(bounds.top, 0) + margin;
      const bottom = Math.min(bounds.bottom, window.innerHeight) - 8;
      if (bottom <= top || rect.height === 0) return;
      const oversized = rect.height > bottom - top;
      if (
        rect.top >= top &&
        (rect.bottom <= bottom || (oversized && rect.top < bottom - 36))
      )
        return;
      content.style.scrollMarginTop = `${margin}px`;
      content.style.scrollMarginBottom = "8px";
      content.scrollIntoView?.({
        block: oversized ? "start" : "nearest",
        inline: "nearest",
        behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)")
          .matches
          ? "instant"
          : "smooth",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [collapsed]);
  function toggle(id: string) {
    pendingReveal.current = !visible && collapsed.has(id) ? id : null;
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
    if (!showStaticCalls && call.type === "STATICCALL") return null;
    if (visible && !visible.has(call.id)) return null;
    const rolledBack = ancestorFailed || !!call.error;
    const open = !!visible || !collapsed.has(call.id);
    const entry = entries[call.id];
    const decoded = entry?.data;
    const precompile = tracePrecompile(call);
    const contractName = precompile ? "Precompiled" : decoded?.contractName;
    const functionName = decoded?.input
      ? getDisplayFunctionName(
          decoded.input.functionName,
          decoded.input.guessedFunctionName
        ).name
      : undefined;
    const displayedLogs = call.logs.slice(0, 50);
    function logsAt(position?: number) {
      if (failuresOnly && !call.error) return null;
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
            as="span"
            fontSize="xs"
            fontFamily="mono"
            color={functionName ? "green.300" : "text.secondary"}
          >
            <Text as="span" color="blue.200" title={call.to}>
              {contractName || (call.to ? shortAddress(call.to) : "Contract creation")}
            </Text>
            {functionName ? "." : " "}
            {functionName ? (
              <>
                {functionName}
                <Text as="span" color="text.primary">
                  ({previewArgs(decoded!.input!.args)})
                </Text>
              </>
            ) : precompile ? (
              <Text as="span" color="text.secondary">{precompile}</Text>
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
              {decoded?.outputsInferred && (
                <Text
                  as="span"
                  color="orange.300"
                  ml={1}
                  title="Inferred return types"
                >
                  ~
                </Text>
              )}
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
            call.logs.length > 0 ||
            (showParameters && decoded)) && (
            <Box
              ref={(element: HTMLDivElement | null) => {
                if (element) expandedContent.current.set(call.id, element);
                else expandedContent.current.delete(call.id);
              }}
              data-trace-children={call.id}
              ml={{ base: 1, md: 2 }}
              pl={{ base: 2, md: 3 }}
              borderLeft="1px solid"
              borderColor="whiteAlpha.100"
            >
              {showParameters && decoded && (
                <Box
                  p={3}
                  position="relative"
                  zIndex={0}
                  sx={{ "--tree-sticky-offset": `${(level + 1) * 36}px` }}
                  data-trace-parameters={call.id}
                >
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
              {call.logs.length > 50 && (
                <Text fontSize="xs" color="text.secondary" px={3} py={1}>
                  +{call.logs.length - 50} logs in call details
                </Text>
              )}
            </Box>
          )}
      </Box>
    );
  }
  const failed = shownCalls.filter((call) => call.error).length;
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
            {shownCalls.length} calls
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
          {onVisibleCalls && shownCalls.some((call) => !entries[call.id]) && (
            <Button
              size="xs"
              variant="ghost"
              onClick={() => onVisibleCalls(shownCalls)}
            >
              Decode all
            </Button>
          )}
          <Switch
            size="sm"
            colorScheme="purple"
            isChecked={showStaticCalls}
            onChange={(event) => setShowStaticCalls(event.target.checked)}
            fontSize="xs"
            color={showStaticCalls ? "purple.300" : "text.secondary"}
            px={2}
            display="inline-flex"
            alignItems="center"
            h={6}
            lineHeight={5}
            sx={{ "& .chakra-switch__track[data-checked]": { bg: "purple.300" } }}
          >
            Static calls
          </Switch>
          <Switch
            size="sm"
            colorScheme="blue"
            isChecked={showParameters}
            onChange={(event) => setShowParameters(event.target.checked)}
            fontSize="xs"
            color={showParameters ? "blue.300" : "text.secondary"}
            px={2}
            display="inline-flex"
            alignItems="center"
            h={6}
            lineHeight={5}
            sx={{ "& .chakra-switch__track[data-checked]": { bg: "blue.300" } }}
          >
            Show params
          </Switch>
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
            leftIcon={<FiMaximize2 aria-hidden />}
          >
            Expand all
          </Button>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setCollapsed(new Set(calls.map((call) => call.id)))}
            leftIcon={<FiMinimize2 aria-hidden />}
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
      <Box
        ref={scrollRef}
        data-trace-scroll
        px={2}
        pb={2}
        maxH="72vh"
        overflowY="auto"
        isolation="isolate"
      >
        {shownCalls.length === 0 || visible?.size === 0 ? (
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
