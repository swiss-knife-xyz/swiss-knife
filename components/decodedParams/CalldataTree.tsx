"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Badge, Box, Button, Flex, HStack, Icon, Text } from "@chakra-ui/react";
import { ChevronDownIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { FiTerminal, FiMaximize2, FiMinimize2 } from "react-icons/fi";
import {
  TypeIcon,
  getTypeColor,
} from "@/components/decodedParams/TypeIcon";
import type { Arg, DecodeBytesParamResult } from "@/types";
import { ParamValue } from "./ParamValue";
import { TreeBytesParam } from "@/components/decodedParams/TreeBytesParam";
import { getDisplayFunctionName } from "@/utils/functionNames";

import { compactFormatSelectProps as formatSelectProps } from "./paramStyles";

export interface CalldataTreeEditor {
  reveal?: { path: string; id: string };
  value: (arg: Arg, path: string) => React.ReactNode;
  actions: (arg: Arg, path: string) => React.ReactNode;
  raw: (arg: Arg, path: string) => React.ReactNode;
  hideChildren: (path: string) => boolean;
}

interface Props {
  editor?: CalldataTreeEditor;
  args: Arg[];
  chainId?: number;
  functionName?: string;
  isFunctionNameGuessed?: boolean;
  showControls?: boolean;
  kind?: "revert";
  decodeNote?: string;
}
const TreeState = createContext<{
  expanded: Set<string>;
  editor?: CalldataTreeEditor;
  toggle: (id: string) => void;
}>({ expanded: new Set(), toggle: () => {} });

function childrenOf(arg: Arg): Arg[] | undefined {
  if (
    (arg.baseType === "array" || arg.baseType === "tuple") &&
    Array.isArray(arg.value)
  )
    return arg.value as Arg[];
  if (arg.baseType.includes("bytes"))
    return (arg.value as DecodeBytesParamResult | null)?.decoded?.args;
}

function BranchHeader({
  id,
  level,
  children,
  extra,
  label,
}: {
  id: string;
  level: number;
  children: React.ReactNode;
  extra?: React.ReactNode;
  label: string;
}) {
  const { expanded, toggle } = useContext(TreeState);
  const open = expanded.has(id);
  return (
    <Box
      position="sticky"
      top={`calc(var(--calldata-sticky-offset, 0px) + ${level * 28}px)`}
      zIndex={100 - level}
      _before={
        level > 0
          ? {
              content: '""',
              position: "absolute",
              left: { base: "-9px", md: "-13px" },
              top: "14px",
              width: { base: "9px", md: "13px" },
              borderTop: "1px solid",
              borderColor: "whiteAlpha.200",
              pointerEvents: "none",
            }
          : undefined
      }
    >
      <Flex
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-label={`${label}`}
        onClick={() => toggle(id)}
        onKeyDown={(event) => {
          if (
            event.target === event.currentTarget &&
            (event.key === "Enter" || event.key === " ")
          ) {
            event.preventDefault();
            toggle(id);
          }
        }}
        bg="bg.subtle"
        minH="28px"
        h="28px"
        gap={{ base: 1, md: 2 }}
        align="center"
        px={1}
        overflowX="auto"
        overflowY="hidden"
        sx={{
          scrollbarWidth: "none",
          "& > *": { flexShrink: 0 },
          "&::-webkit-scrollbar": { display: "none" },
        }}
        cursor="pointer"
        borderBottom="1px solid"
        borderColor="whiteAlpha.100"
        _hover={{ bg: "bg.muted" }}
        _focusVisible={{
          outline: "2px solid",
          outlineColor: "blue.400",
          outlineOffset: "-2px",
        }}
        data-calldata-header={id}
      >
        {open ? (
          <ChevronDownIcon boxSize={4} color="text.tertiary" />
        ) : (
          <ChevronRightIcon boxSize={4} color="text.tertiary" />
        )}
        {children}
        {extra && (
          <Box ml="auto" onClick={(event) => event.stopPropagation()}>
            {extra}
          </Box>
        )}
      </Flex>
    </Box>
  );
}

function Parameter({
  arg,
  id,
  level,
  index,
  indexed,
  chainId,
}: {
  arg: Arg;
  id: string;
  level: number;
  index: number;
  indexed?: boolean;
  chainId?: number;
}) {
  const { expanded, editor } = useContext(TreeState);
  const [showRaw, setShowRaw] = useState(false);
  const children = childrenOf(arg);
  const decoded = arg.baseType.includes("bytes")
    ? (arg.value as DecodeBytesParamResult | null)?.decoded
    : null;
  const functionDisplay = decoded
    ? getDisplayFunctionName(decoded.functionName, decoded.guessedFunctionName)
    : undefined;
  const name = indexed
    ? `[${index}]${arg.name ? ` ${arg.name}` : ""}`
    : arg.name || `arg${index}`;
  const type = arg.type;
  const expandable = !!decoded || children !== undefined;
  if (!expandable)
    return (
      <Flex
        className="calldata-leaf"
        data-calldata-path={id}
        scrollMarginTop={editor ? `${(level + 1) * 28 + 12}px` : undefined}
        role="group"
        aria-label={`${name}, ${type}`}
        gap={{ base: 1, md: 3 }}
        direction={{ base: "column", md: "row" }}
        align={{ base: "stretch", md: "center" }}
        py={1}
        pl={{ base: 1, md: 5 }}
      >
        <Box
          flexShrink={0}
          w={{ base: "full", md: "150px" }}
          minW={0}
          position="relative"
          _before={
            level > 0
              ? {
                  content: '""',
                  position: "absolute",
                  left: { base: "-13px", md: "-33px" },
                  top: "9px",
                  width: { base: "9px", md: "29px" },
                  borderTop: "1px solid",
                  borderColor: "whiteAlpha.200",
                  pointerEvents: "none",
                }
              : undefined
          }
        >
          <Text
            fontSize="xs"
            fontFamily="mono"
            color="text.secondary"
            overflowWrap="anywhere"
          >
            {name}
          </Text>
          <HStack spacing={1.5} mt={0.5}>
            <TypeIcon
              baseType={arg.baseType}
              color={getTypeColor(arg.baseType)}
              boxSize={3}
              aria-hidden
            />
            <Text
              fontSize="11px"
              fontFamily="mono"
              color={getTypeColor(arg.baseType)}
            >
              {type}
            </Text>
          </HStack>
          {arg.decodeNote && !arg.decodeNote.startsWith("Unknown command") && (
            <Text fontSize="10px" color="yellow.300" mt={1}>
              {arg.decodeNote}
            </Text>
          )}
        </Box>
        <Box flex="1" minW={0} className="calldata-value">
          {editor ? editor.value(arg, id) : <ParamValue arg={arg} chainId={chainId} />}
          {editor?.actions(arg, id)}
        </Box>
      </Flex>
    );
  const synthetic =
    decoded?.functionName === "tx" && /^tx #\d+$/.test(arg.name);
  const functionName = synthetic ? undefined : functionDisplay?.name;
  return (
    <Box mb={1} data-calldata-branch={id} data-calldata-path={id}
      scrollMarginTop={editor ? `${(level + 1) * 28 + 12}px` : undefined}>
      <BranchHeader
        id={id}
        level={level}
        label={`${name}${functionName ? `, ${functionName}` : ""}`}
        extra={
          editor ? editor.actions(arg, id) : decoded && (
            <Button
              size="xs"
              h="22px"
              variant="ghost"
              fontWeight="normal"
              color="text.tertiary"
              borderRadius="2px"
              _hover={{
                bg: "whiteAlpha.50",
                color: "text.secondary",
                borderRadius: "2px",
              }}
              aria-expanded={showRaw}
              aria-controls={`raw-${id}`}
              onClick={() => setShowRaw(!showRaw)}
            >
              {showRaw ? "Hide raw" : "Raw bytes"}
            </Button>
          )
        }
      >
        <TypeIcon
          baseType={arg.baseType}
          color={getTypeColor(arg.baseType)}
          boxSize={3.5}
          aria-hidden
        />
        <Text
          fontFamily="mono"
          fontSize="xs"
          fontWeight="medium"
          color="text.secondary"
          whiteSpace="nowrap"
        >
          {name}
        </Text>
        <Text
          fontFamily="mono"
          fontSize="11px"
          color={getTypeColor(arg.baseType)}
        >
          {type}
        </Text>
        {functionName && (
          <>
            <Text color="text.tertiary" fontSize="xs">
              →
            </Text>
            {decoded?.kind === "revert" && <Badge colorScheme="red">Revert</Badge>}
            <Icon as={FiTerminal} boxSize={3.5} color="blue.400" aria-hidden />
            <Text
              fontFamily="mono"
              fontSize="16px"
              fontWeight="600"
              color="blue.300"
            >
              {functionName}
              {decoded?.functionName === "SafeMultiSend transactions" ||
              /^[A-Z][A-Z0-9_]+$/.test(functionName)
                ? ""
                : "()"}
            </Text>
          </>
        )}
        {arg.decodeNote && !arg.decodeNote.startsWith("Unknown command") && (
          <Badge
            fontSize="9px"
            color="yellow.300"
            bg="whiteAlpha.100"
            whiteSpace="normal"
          >
            {arg.decodeNote}
          </Badge>
        )}
        <Text fontSize="11px" color="text.tertiary">
          {children?.length ?? 0}{" "}
          {arg.baseType === "array"
            ? "items"
            : arg.baseType === "tuple"
              ? "fields"
              : children?.length === 1
                ? "param"
                : "params"}
        </Text>
      </BranchHeader>
      {editor?.raw(arg, id)}
      {showRaw && (
        <Box id={`raw-${id}`} pl={5} py={2} className="calldata-value">
          <TreeBytesParam
            formatSelectProps={formatSelectProps}
            arg={{
              rawValue: String(arg.rawValue ?? "0x"),
              value: { decoded: null },
            }}
            chainId={chainId}
          />
        </Box>
      )}
      <Box
        hidden={!expanded.has(id) || editor?.hideChildren(id)}
        ml={{ base: 1, md: 2 }}
        pl={{ base: 2, md: 3 }}
        borderLeft="1px solid"
        borderColor="whiteAlpha.100"
      >
        {decoded?.decodeNote && <Text px={3} py={2} fontSize="sm" color="text.secondary">{decoded.decodeNote}</Text>}
        {children?.map((child, i) => (
          <Parameter
            key={`${id}.${i}`}
            arg={child}
            id={`${id}.${i}`}
            level={level + 1}
            index={i}
            indexed={arg.baseType === "array"}
            chainId={chainId}
          />
        ))}
        {!children?.length && (
          <Text fontSize="xs" color="text.tertiary" py={2}>
            {arg.baseType === "array" ? "No items" : "No parameters"}
          </Text>
        )}
      </Box>
    </Box>
  );
}

/** Inline parameter controls with native, branch-scoped sticky ancestry. */
export function CalldataTree({
  args,
  chainId,
  functionName,
  isFunctionNameGuessed,
  showControls = true,
  kind,
  decodeNote,
  editor,
}: Props) {
  const hasRoot = !!functionName && functionName !== "__abi_decoded__";
  const ids = useMemo(() => {
    const result = hasRoot ? ["root"] : [];
    function visit(items: Arg[], prefix: string) {
      items.forEach((arg, i) => {
        const id = `${prefix}.${i}`;
        const children = childrenOf(arg);
        if (
          children !== undefined ||
          (arg.baseType.includes("bytes") &&
            (arg.value as DecodeBytesParamResult | null)?.decoded)
        )
          result.push(id);
        if (children) visit(children, id);
      });
    }
    visit(args, "args");
    return result;
  }, [args, hasRoot]);
  const [collapsed, setCollapsed] = useState(() => new Set<string>());
  const reveal = editor?.reveal;
  useEffect(() => {
    if (!reveal) return;
    setCollapsed(previous => new Set([...previous].filter(path =>
      path !== "root" && path !== reveal.path && !reveal.path.startsWith(`${path}.`)
    )));
  }, [reveal]);
  const expanded = useMemo(() => new Set(ids.filter(id => !collapsed.has(id))), [ids, collapsed]);
  useEffect(() => {
    // Drop obsolete disclosures; new branches are expanded in their first render.
    setCollapsed(previous => {
      const next = new Set([...previous].filter(id => ids.includes(id)));
      return next.size === previous.size ? previous : next;
    });
  }, [ids]);
  const state = useMemo(() => ({
    expanded,
    editor,
    toggle: (id: string) => setCollapsed(previous => {
      const next = new Set(previous);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    }),
  }), [expanded, editor]);
  const treeControls = showControls ? (
    <HStack spacing={1}>
      <Button
        size="xs"
        variant="ghost"
        leftIcon={<Icon as={FiMaximize2} boxSize={3} />}
        onClick={() => setCollapsed(new Set())}
      >
        Expand all
      </Button>
      <Button
        size="xs"
        variant="ghost"
        leftIcon={<Icon as={FiMinimize2} boxSize={3} />}
        onClick={() => setCollapsed(new Set(ids))}
      >
        Collapse all
      </Button>
    </HStack>
  ) : null;
  return (
    <TreeState.Provider value={state}>
      <Box
        border="1px solid"
        borderColor="whiteAlpha.200"
        borderRadius="md"
        bg="bg.subtle"
        overflow="clip"
        isolation="isolate"
        minW={0}
        sx={{ containerType: "inline-size", containerName: "calldata" }}
      >
        {!hasRoot && showControls && (
          <Flex px={3} py={1} justify="flex-end">
            {treeControls}
          </Flex>
        )}
        <Box data-calldata-tree="true">
          <Box
            minW={0}
            px={3}
            pt={2}
            pb={3}
            sx={{
              "& .calldata-value": { position: "relative", zIndex: 0 },
              "& .calldata-value .decoded-integer": {
                flexDirection: "row",
              },
              "@container calldata (max-width: 560px)": {
                "& .calldata-leaf": {
                  flexDirection: "column", alignItems: "stretch", paddingLeft: "4px", gap: "6px",
                },
                "& .calldata-leaf > :first-of-type": {
                  width: "100%", display: "flex", alignItems: "baseline", flexWrap: "wrap", columnGap: "8px",
                  "&::before": { display: "none" },
                },
                "& .calldata-value": { width: "100%" },
              },
              "& .calldata-value > div": {
                transform: "none !important",
                opacity: "1 !important",
              },
            }}
          >
            {hasRoot && (
              <BranchHeader
                id="root"
                level={0}
                label={functionName!}
                extra={treeControls}
              >
                <Icon
                  as={FiTerminal}
                  boxSize={3.5}
                  color={kind === "revert" ? "red.300" : "green.400"}
                  aria-hidden
                />
                <Text
                  fontFamily="mono"
                  fontSize="16px"
                  fontWeight="600"
                  color={kind === "revert" ? "red.300" : "green.300"}
                >
                  {functionName}()
                </Text>
                {kind === "revert" && <Badge colorScheme="red">Revert</Badge>}
                {isFunctionNameGuessed && (
                  <Badge fontSize="9px">inferred</Badge>
                )}
                <Text fontSize="11px" color="text.tertiary">
                  {args.length} params
                </Text>
              </BranchHeader>
            )}
            <Box
              hidden={hasRoot && !expanded.has("root")}
              pt={hasRoot ? 1 : 0}
              ml={hasRoot ? { base: 1, md: 2 } : 0}
              pl={hasRoot ? { base: 2, md: 3 } : 0}
              borderLeft={hasRoot ? "1px solid" : undefined}
              borderColor="whiteAlpha.100"
            >
              {decodeNote && <Text px={3} py={2} fontSize="sm" color="text.secondary">{decodeNote}</Text>}
              {args.map((arg, i) => (
                <Parameter
                  key={`args.${i}`}
                  arg={arg}
                  id={`args.${i}`}
                  level={hasRoot ? 1 : 0}
                  index={i}
                  chainId={chainId}
                />
              ))}
              {!args.length && (
                <Text fontSize="xs" color="text.tertiary" p={3}>
                  No parameters
                </Text>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </TreeState.Provider>
  );
}
