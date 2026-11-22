"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Badge, Box, Button, Flex, HStack, Icon, Text } from "@chakra-ui/react";
import { ChevronDownIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { FiTerminal, FiMaximize2, FiMinimize2 } from "react-icons/fi";
import {
  TypeIcon,
  getTypeColor,
} from "@/components/decodedParams/TreeView/TypeIcon";
import type { Arg, DecodeBytesParamResult } from "@/types";
import {
  AddressParam,
  IntParam,
  StringParam,
  UintParam,
} from "@/components/decodedParams";
import { TreeBytesParam } from "@/components/decodedParams/TreeView/TreeBytesParam";
import { getDisplayFunctionName } from "@/utils/functionNames";

import type { FormatSelectProps } from "@/components/DarkSelect";

const formatSelectProps: FormatSelectProps = {
  size: "sm",
  controlProps: {
    h: "32px",
    minH: "32px",
    borderRadius: "4px",
    fontSize: "12px",
  },
  boxProps: { w: "7rem", minW: "7rem", maxW: "7rem", flexShrink: 0 },
};

interface Props {
  args: Arg[];
  chainId?: number;
  functionName?: string;
  isFunctionNameGuessed?: boolean;
}
const TreeState = createContext<{
  expanded: Set<string>;
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

function Value({ arg, chainId }: { arg: Arg; chainId?: number }) {
  if (arg.baseType === "address")
    return (
      <AddressParam
        address={arg.value}
        chainId={chainId}
        showLink
        explorerButtonProps={{ borderRadius: "4px" }}
        modeButtonProps={{ borderRadius: 0 }}
      />
    );
  if (arg.baseType.includes("uint"))
    return (
      <UintParam
        value={arg.value}
        formatting="separators"
        formatSelectProps={formatSelectProps}
        formatButtonProps={{
          borderRadius: 0,
          color: "text.secondary",
          _hover: { bg: "whiteAlpha.100", color: "text.primary" },
        }}
      />
    );
  if (arg.baseType.includes("int"))
    return <IntParam value={arg.value} formatSelectProps={formatSelectProps} />;
  if (arg.baseType.includes("bytes"))
    return (
      <TreeBytesParam
        formatSelectProps={formatSelectProps}
        arg={{
          rawValue: String(arg.rawValue ?? "0x"),
          value: { decoded: null },
        }}
        chainId={chainId}
      />
    );
  return (
    <StringParam
      value={
        arg.baseType === "tuple"
          ? "{}"
          : arg.value == null
            ? "null"
            : String(arg.value)
      }
    />
  );
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
      top={`${level * 28}px`}
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
  const { expanded } = useContext(TreeState);
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
  const type = arg.type.includes("tuple")
    ? arg.baseType === "array"
      ? "tuple[]"
      : "tuple"
    : arg.type;
  const expandable = !!decoded || !!children?.length;
  if (!expandable)
    return (
      <Flex
        className="calldata-leaf"
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
        </Box>
        <Box flex="1" minW={0} className="calldata-value">
          <Value arg={arg} chainId={chainId} />
        </Box>
      </Flex>
    );
  const synthetic =
    decoded?.functionName === "tx" && /^tx #\d+$/.test(arg.name);
  const functionName = synthetic ? undefined : functionDisplay?.name;
  return (
    <Box mb={1} data-calldata-branch={id}>
      <BranchHeader
        id={id}
        level={level}
        label={`${name}${functionName ? `, ${functionName}` : ""}`}
        extra={
          decoded && (
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
            <Icon as={FiTerminal} boxSize={3.5} color="blue.400" aria-hidden />
            <Text
              fontFamily="mono"
              fontSize="16px"
              fontWeight="600"
              color="blue.300"
            >
              {functionName}
              {decoded?.functionName === "SafeMultiSend transactions"
                ? ""
                : "()"}
            </Text>
          </>
        )}
        {functionDisplay?.isGuessed && (
          <Badge fontSize="9px" color="text.tertiary" bg="whiteAlpha.100">
            inferred
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
        hidden={!expanded.has(id)}
        ml={{ base: 1, md: 2 }}
        pl={{ base: 2, md: 3 }}
        borderLeft="1px solid"
        borderColor="whiteAlpha.100"
      >
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
            No parameters
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
}: Props) {
  const hasRoot = !!functionName && functionName !== "__abi_decoded__";
  const ids = useMemo(() => {
    const result = hasRoot ? ["root"] : [];
    function visit(items: Arg[], prefix: string) {
      items.forEach((arg, i) => {
        const id = `${prefix}.${i}`;
        const children = childrenOf(arg);
        if (
          children?.length ||
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
  const [expanded, setExpanded] = useState(() => new Set(ids));
  useEffect(() => {
    setExpanded(new Set(ids));
  }, [ids]);
  const state = useMemo(
    () => ({
      expanded,
      toggle: (id: string) =>
        setExpanded((previous) => {
          const next = new Set(previous);
          next.has(id) ? next.delete(id) : next.add(id);
          return next;
        }),
    }),
    [expanded]
  );
  const treeControls = (
    <HStack spacing={1}>
      <Button
        size="xs"
        variant="ghost"
        leftIcon={<Icon as={FiMaximize2} boxSize={3} />}
        onClick={() => setExpanded(new Set(ids))}
      >
        Expand all
      </Button>
      <Button
        size="xs"
        variant="ghost"
        leftIcon={<Icon as={FiMinimize2} boxSize={3} />}
        onClick={() => setExpanded(new Set())}
      >
        Collapse all
      </Button>
    </HStack>
  );
  return (
    <TreeState.Provider value={state}>
      <Box
        border="1px solid"
        borderColor="whiteAlpha.200"
        borderRadius="md"
        bg="bg.subtle"
        overflow="clip"
      >
        {!hasRoot && (
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
              "& .calldata-value div:has(> .uint-select-container)": {
                flexDirection: "row",
              },
              "& .calldata-value input.chakra-input": {
                height: "32px",
                fontSize: "12px",
                fontFamily: "mono",
                borderRadius: "4px",
              },
              "& .calldata-value .chakra-input__right-element": {
                height: "32px",
              },
              "& .calldata-value .chakra-input__left-element": {
                height: "32px",
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
                  color="green.400"
                  aria-hidden
                />
                <Text
                  fontFamily="mono"
                  fontSize="16px"
                  fontWeight="600"
                  color="green.300"
                >
                  {functionName}()
                </Text>
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
