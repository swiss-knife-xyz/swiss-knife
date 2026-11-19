"use client";
import { useMemo, useState } from "react";
import { Badge, Box, Button, Flex, HStack, Text } from "@chakra-ui/react";
import { TreeBranchHeader } from "@/components/decodedParams/TreeView/TreeBranchHeader";
import type { CallFrame } from "@/lib/trace/model";

const names: Record<string, string> = {
  "0xa9059cbb": "transfer(address,uint256)",
  "0x23b872dd": "transferFrom(address,address,uint256)",
  "0x095ea7b3": "approve(address,uint256)",
  "0x70a08231": "balanceOf(address)",
  "0xdd62ed3e": "allowance(address,address)",
  "0x01ffc9a7": "supportsInterface(bytes4)",
  "0xb61d27f6": "execute(address,uint256,bytes)",
};
function Raw({ label, value }: { label: string; value?: string }) {
  return (
    <Box>
      <Text fontSize="xs" color="text.tertiary">
        {label}
      </Text>
      <Text
        as="pre"
        whiteSpace="pre-wrap"
        overflowWrap="anywhere"
        fontSize="xs"
        fontFamily="mono"
        maxH="160px"
        overflowY="auto"
      >
        {value ?? "Not provided by tracer"}
      </Text>
    </Box>
  );
}
function Frame({
  frame,
  level,
  expanded,
  toggle,
  ancestorFailed,
}: {
  frame: CallFrame;
  level: number;
  expanded: Set<string>;
  toggle: (id: string) => void;
  ancestorFailed: boolean;
}) {
  const [raw, setRaw] = useState(false);
  const id = `trace-${frame.path}`;
  const selector =
    !["CREATE", "CREATE2", "SELFDESTRUCT"].includes(frame.type) &&
    frame.input.length >= 10
      ? frame.input.slice(0, 10).toLowerCase()
      : undefined;
  const name = selector ? names[selector] : undefined;
  return (
    <Box data-trace-frame={frame.path} mb={2}>
      <TreeBranchHeader
        id={id}
        level={Math.min(level, 6)}
        label={`${frame.type} frame ${frame.path}`}
        open={expanded.has(frame.path)}
        onToggle={() => toggle(frame.path)}
      >
        <Badge colorScheme={frame.error ? "red" : "blue"}>{frame.type}</Badge>
        <Text fontFamily="mono" fontSize="xs">
          {frame.path}
        </Text>
        {selector && (
          <Text fontFamily="mono" fontSize="xs" color="blue.300">
            {selector}
          </Text>
        )}
        <Text
          fontSize="xs"
          color={frame.error || ancestorFailed ? "red.300" : "green.300"}
        >
          {frame.error
            ? "Failed"
            : ancestorFailed
              ? "Returned (ancestor reverted)"
              : "Returned"}
        </Text>
      </TreeBranchHeader>
      <Box
        id={`tree-children-${id}`}
        hidden={!expanded.has(frame.path)}
        pl={level < 6 ? { base: 2, md: 3 } : 0}
        ml={level < 6 ? { base: 1, md: 2 } : 0}
        borderLeft="1px solid"
        borderColor="whiteAlpha.200"
        minW={0}
      >
        <Box py={2} fontSize="xs" overflowWrap="anywhere">
          {name && (
            <Text color="blue.300" fontFamily="mono">
              {name}{" "}
              <Text as="span" color="text.tertiary" fontFamily="body">
                — selector match, not verified ABI
              </Text>
            </Text>
          )}
          {!selector && (
            <Text color="text.tertiary">
              {["CREATE", "CREATE2"].includes(frame.type)
                ? "Contract creation (initcode, not calldata)"
                : frame.type === "SELFDESTRUCT"
                  ? "Selfdestruct / refund recipient"
                  : frame.input === "0x"
                    ? "Empty calldata / native transfer or receive"
                    : "Short calldata (no complete selector)"}
            </Text>
          )}
          <Text fontFamily="mono">
            <Text as="span" color="text.tertiary">
              from{" "}
            </Text>
            {frame.from}
          </Text>
          <Text fontFamily="mono">
            <Text as="span" color="text.tertiary">
              {frame.type === "DELEGATECALL" || frame.type === "CALLCODE"
                ? "code target "
                : "to "}
            </Text>
            {frame.to ?? "Not created"}
          </Text>
          <Flex gap={3} wrap="wrap" color="text.tertiary" mt={1}>
            {frame.value !== undefined && (
              <Text>
                Value: {BigInt(frame.value).toString()} wei
                {frame.type === "DELEGATECALL"
                  ? " (inherited, not a transfer)"
                  : ""}
              </Text>
            )}
            <Text>
              Gas used:{" "}
              {frame.gasUsed === undefined
                ? "not provided"
                : BigInt(frame.gasUsed).toString()}
            </Text>
            {frame.gas && (
              <Text>Gas supplied: {BigInt(frame.gas).toString()}</Text>
            )}
          </Flex>
          {frame.error && (
            <Box borderLeft="2px solid" borderColor="red.400" pl={2} my={2}>
              <Text color="red.300">{frame.error}</Text>
              {frame.revertReason && (
                <Text color="red.200">{frame.revertReason}</Text>
              )}
            </Box>
          )}
          <Button
            size="xs"
            variant="ghost"
            mt={1}
            onClick={() => setRaw(!raw)}
            aria-expanded={raw}
            aria-controls={`raw-${id}`}
          >
            {raw ? "Hide raw data" : "Raw data"}
          </Button>
          <Box
            id={`raw-${id}`}
            hidden={!raw}
            p={2}
            bg="whiteAlpha.50"
            borderRadius="md"
          >
            <Raw
              label={frame.type.startsWith("CREATE") ? "Initcode" : "Input"}
              value={frame.input}
            />
            <Raw label="Output / revert data" value={frame.output} />
          </Box>
        </Box>
        {frame.children.map((child) => (
          <Frame
            key={child.path}
            frame={child}
            level={level + 1}
            expanded={expanded}
            toggle={toggle}
            ancestorFailed={ancestorFailed || !!frame.error}
          />
        ))}
      </Box>
    </Box>
  );
}
export function TraceTree({ root }: { root: CallFrame }) {
  const ids = useMemo(() => {
    const list: string[] = [];
    function walk(f: CallFrame) {
      list.push(f.path);
      f.children.forEach(walk);
    }
    walk(root);
    return list;
  }, [root]);
  const [expanded, setExpanded] = useState(() => new Set(ids));
  const toggle = (id: string) =>
    setExpanded((previous) => {
      const next = new Set(previous);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  return (
    <Box
      border="1px solid"
      borderColor="whiteAlpha.200"
      borderRadius="md"
      bg="bg.subtle"
      p={{ base: 2, md: 3 }}
      minW={0}
    >
      <HStack justify="space-between" mb={2} flexWrap="wrap">
        <Text fontSize="xs" color="text.tertiary">
          {ids.length} executed frames · sibling order = execution order
        </Text>
        <HStack>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setExpanded(new Set(ids))}
          >
            Expand all
          </Button>
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setExpanded(new Set())}
          >
            Collapse all
          </Button>
        </HStack>
      </HStack>
      <Frame
        frame={root}
        level={0}
        expanded={expanded}
        toggle={toggle}
        ancestorFailed={false}
      />
    </Box>
  );
}
