"use client";
import { useEffect, useState } from "react";
import {
  Box,
  Button,
  HStack,
  IconButton,
  Spinner,
  Text,
} from "@chakra-ui/react";
import {
  Box as BoxIcon,
  Braces,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Code2,
  Hash,
  List,
  Settings2,
  Zap,
} from "lucide-react";
import type { OutlineKind, OutlineSymbol } from "@/lib/solidity/outline";
import { useSourceOutline } from "./useSourceOutline";
export type SourceOutlineInput = {
  path: string;
  content: string;
  onSelect(line: number, column: number): void;
};
const short: Record<string, string> = {
  external: "ext",
  internal: "int",
  public: "pub",
  private: "priv",
};
function SymbolIcon({ kind }: { kind: OutlineKind }) {
  if (["function", "constructor", "receive", "fallback"].includes(kind))
    return (
      <Text
        as="span"
        fontSize="xs"
        fontFamily="mono"
        fontWeight="bold"
        color="purple.300"
        w={3}
        flexShrink={0}
      >
        fn
      </Text>
    );
  const Icon =
    (
      {
        contract: BoxIcon,
        interface: BoxIcon,
        library: BoxIcon,
        struct: Braces,
        enum: List,
        enumMember: Hash,
        variable: Code2,
        event: Zap,
        error: CircleAlert,
        modifier: Settings2,
        type: Braces,
      } as Partial<Record<OutlineKind, typeof BoxIcon>>
    )[kind] ?? Code2;
  return (
    <Box
      as="span"
      display="flex"
      flexShrink={0}
      color={
        ["contract", "interface", "library"].includes(kind)
          ? "orange.300"
          : "cyan.300"
      }
    >
      <Icon size={13} />
    </Box>
  );
}
function OutlineRows({
  symbols,
  onSelect,
  loading,
  depth = 0,
}: {
  symbols: OutlineSymbol[];
  onSelect: SourceOutlineInput["onSelect"];
  loading: boolean;
  depth?: number;
}) {
  const [collapsed, setCollapsed] = useState(new Set<string>());
  return (
    <>
      {symbols.map((symbol) => (
        <Box key={symbol.id}>
          <HStack
            spacing={0}
            pl={`${4 + depth * 12}px`}
            pr={1}
            minW={0}
            _hover={{ bg: "whiteAlpha.100" }}
          >
            {symbol.children.length ? (
              <IconButton
                variant="ghost"
                size="xs"
                minW={5}
                w={5}
                h={7}
                flexShrink={0}
                aria-label={`${collapsed.has(symbol.id) ? "Expand" : "Collapse"} ${symbol.name}`}
                aria-expanded={!collapsed.has(symbol.id)}
                icon={
                  collapsed.has(symbol.id) ? (
                    <ChevronRight size={13} />
                  ) : (
                    <ChevronDown size={13} />
                  )
                }
                onClick={() =>
                  setCollapsed((current) => {
                    const next = new Set(current);
                    if (next.has(symbol.id)) next.delete(symbol.id);
                    else next.add(symbol.id);
                    return next;
                  })
                }
              />
            ) : (
              <Box w={5} flexShrink={0} />
            )}
            <Button
              variant="unstyled"
              display="flex"
              alignItems="center"
              justifyContent="flex-start"
              gap={1.5}
              flex={1}
              minW={0}
              h={7}
              borderRadius="none"
              fontSize="xs"
              fontWeight="normal"
              isDisabled={loading}
              aria-label={`Go to ${symbol.kind} ${symbol.name}, line ${symbol.line}`}
              title={`${symbol.kind} ${symbol.name} ${symbol.detail} ${symbol.tags.join(" ")}`}
              onClick={() => onSelect(symbol.line, symbol.column)}
              _focusVisible={{
                outline: "1px solid",
                outlineColor: "primary.400",
                outlineOffset: "-1px",
              }}
            >
              <SymbolIcon kind={symbol.kind} />
              <Text
                as="span"
                overflow="hidden"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
                minW={0}
              >
                {symbol.name}
              </Text>
              {symbol.detail && (
                <Text
                  as="span"
                  color="text.tertiary"
                  overflow="hidden"
                  textOverflow="ellipsis"
                  whiteSpace="nowrap"
                  minW={0}
                >
                  {symbol.detail}
                </Text>
              )}
              {symbol.tags.length > 0 && (
                <HStack as="span" spacing={1} ml="auto" pl={1} flexShrink={0}>
                  {symbol.tags.map((tag) => (
                    <Text
                      as="span"
                      key={tag}
                      fontSize="9px"
                      lineHeight="16px"
                      px={1}
                      borderRadius="sm"
                      bg="whiteAlpha.100"
                      color={
                        tag === "payable" ? "orange.200" : "text.secondary"
                      }
                    >
                      {short[tag] ?? tag}
                    </Text>
                  ))}
                </HStack>
              )}
            </Button>
          </HStack>
          {!!symbol.children.length && !collapsed.has(symbol.id) && (
            <OutlineRows
              symbols={symbol.children}
              onSelect={onSelect}
              loading={loading}
              depth={depth + 1}
            />
          )}
        </Box>
      ))}
    </>
  );
}
export function SourceOutline({
  source,
  enabled = true,
  fitContent = false,
  onAvailabilityChange,
}: {
  source: SourceOutlineInput;
  enabled?: boolean;
  fitContent?: boolean;
  onAvailabilityChange?(available: boolean): void;
}) {
  const supported = source.path.endsWith(".sol");
  const { symbols, loading, unavailable } = useSourceOutline(
    source.path,
    source.content,
    enabled && supported
  );
  const available = supported && loading ? null : supported && !unavailable && symbols.length > 0;
  useEffect(() => {
    if (available !== null) onAvailabilityChange?.(available);
  }, [source.path, available, onAvailabilityChange]);
  return (
    <Box
      role="region"
      aria-label="Source outline"
      minW={0}
      overflowY="auto"
      h={fitContent ? "auto" : "full"}
      py={1}
    >
      {symbols.length ? (
        <OutlineRows
          key={source.path}
          symbols={symbols}
          loading={loading}
          onSelect={source.onSelect}
        />
      ) : (
        <HStack px={3} py={2} spacing={2} fontSize="xs" color="text.tertiary">
          {loading && <Spinner size="xs" />}
          <Text>
            {!source.path
              ? "Open a file"
              : loading
                ? "Loading outline…"
                : !supported || unavailable
                  ? "Outline unavailable"
                  : "No declarations"}
          </Text>
        </HStack>
      )}
    </Box>
  );
}
