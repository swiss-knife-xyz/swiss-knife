"use client";

import React, { useEffect, useRef } from "react";
import { Box, HStack, Text, Collapse, Link } from "@chakra-ui/react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
} from "@chakra-ui/icons";
import { isAddress } from "viem";

import { Arg, DecodeBytesParamResult } from "@/types";
import { getPath } from "@/utils";
import subdomains from "@/subdomains";

import { TypeIcon, getTypeColor } from "./TypeIcon";
import {
  useTreeContext,
  hasChildren,
  getChildrenCount,
  getChildTypeLabel,
} from "./TreeContext";
import {
  UintParam,
  IntParam,
  AddressParam,
  StringParam,
} from "@/components/decodedParams";
import { TreeBytesParam } from "./TreeBytesParam";

// Helper to get parent node ID for collapsing from tree lines
function getParentNodeId(nodeId: string, depth: number): string | null {
  // Check if this is a decoded child (ends with ".decoded.N")
  const decodedMatch = nodeId.match(/^(.+)\.decoded\.\d+$/);
  if (decodedMatch) {
    return decodedMatch[1];
  }

  // Regular child (ends with ".N")
  const lastDotIndex = nodeId.lastIndexOf(".");
  if (lastDotIndex === -1) {
    // Top-level node like "0", "1" - parent is "root" if depth > 0 (has function root)
    return depth > 0 ? "root" : null;
  }

  return nodeId.substring(0, lastDotIndex);
}

interface TreeNodeProps {
  arg: Arg;
  nodeId: string;
  depth: number;
  isLast: boolean;
  chainId?: number;
  index?: number;
  showIndex?: boolean;
}

export function TreeNode({
  arg,
  nodeId,
  depth,
  isLast,
  chainId,
  index,
  showIndex,
}: TreeNodeProps) {
  const {
    isExpanded,
    toggleNode,
    registerNode,
    focusedNodeId,
    hoveredParentId,
    setHoveredParentId,
    registerStickyNode,
    unregisterStickyNode,
  } = useTreeContext();
  const expanded = isExpanded(nodeId);
  const hasChildNodes = hasChildren(arg);
  const childCount = getChildrenCount(arg);
  const headerRef = useRef<HTMLDivElement>(null);

  // Get parent node ID for collapsing via tree lines
  const parentNodeId = getParentNodeId(nodeId, depth);

  // Handler for clicking tree connector lines
  const handleLineClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (parentNodeId) {
      toggleNode(parentNodeId);
    }
  };

  // Check if this node is focused or is an ancestor/descendant of the focused node
  const isFocusedOrRelated = (() => {
    if (!focusedNodeId) return true;

    // This node is the focused node
    if (nodeId === focusedNodeId) return true;

    // This node is a descendant of the focused node
    if (nodeId.startsWith(focusedNodeId + ".")) return true;

    // The focused node is a descendant of this node (this node is ancestor)
    if (focusedNodeId.startsWith(nodeId + ".")) return true;

    // Special case: if root is focused, all top-level nodes are children
    if (focusedNodeId === "root" && !nodeId.includes(".")) return true;

    // Special case: if a top-level node is focused, root is its ancestor
    if (nodeId === "root" && !focusedNodeId.includes(".")) return true;

    return false;
  })();

  const isDimmed = focusedNodeId !== null && !isFocusedOrRelated;

  // Get type display for sticky header
  const getTypeDisplay = () => {
    const type = arg.type.includes("tuple") ? "tuple" : arg.type;
    return (
      type + (arg.baseType === "array" && !type.includes("[]") ? "[]" : "")
    );
  };

  // Get label for sticky header
  const getStickyLabel = () => {
    if (showIndex && index !== undefined) {
      return `[${index}]${arg.name ? ` ${arg.name}` : ""}`;
    }
    return arg.name || "";
  };

  // Register this node for expand all / collapse all
  useEffect(() => {
    if (hasChildNodes) {
      registerNode(nodeId, depth, childCount);
    }
  }, [nodeId, depth, childCount, hasChildNodes, registerNode]);

  // Register for sticky headers (only expandable nodes)
  useEffect(() => {
    if (hasChildNodes) {
      registerStickyNode({
        nodeId,
        depth,
        label: getStickyLabel(),
        type: getTypeDisplay(),
        baseType: arg.baseType,
        childCount,
        element: headerRef.current,
      });
      return () => unregisterStickyNode(nodeId);
    }
  }, [
    nodeId,
    depth,
    hasChildNodes,
    arg.name,
    arg.baseType,
    arg.type,
    index,
    showIndex,
    childCount,
    registerStickyNode,
    unregisterStickyNode,
  ]);

  // Render leaf values (primitives)
  const renderLeafValue = () => {
    if (arg.baseType.includes("uint")) {
      return <UintParam value={arg.value} />;
    }
    if (arg.baseType.includes("int")) {
      return <IntParam value={arg.value} />;
    }
    if (arg.baseType === "address") {
      return <AddressParam address={arg.value} chainId={chainId} name={arg.name} />;
    }
    if (arg.baseType.includes("bytes")) {
      return (
        <TreeBytesParam
          arg={{
            rawValue: arg.rawValue,
            value: { decoded: null },
          }}
          chainId={chainId}
        />
      );
    }
    return <StringParam value={arg.value as string | null} />;
  };

  // Render children for expandable types
  const renderChildren = () => {
    // Array type
    if (arg.baseType === "array" && Array.isArray(arg.value)) {
      return (arg.value as Arg[]).map((child, i) => (
        <TreeNode
          key={`${nodeId}.${i}`}
          arg={child}
          nodeId={`${nodeId}.${i}`}
          depth={depth + 1}
          isLast={i === (arg.value as Arg[]).length - 1}
          chainId={chainId}
          index={i}
          showIndex={true}
        />
      ));
    }

    // Tuple type
    if (arg.baseType === "tuple" && Array.isArray(arg.value)) {
      return (arg.value as Arg[]).map((child, i) => (
        <TreeNode
          key={`${nodeId}.${i}`}
          arg={child}
          nodeId={`${nodeId}.${i}`}
          depth={depth + 1}
          isLast={i === (arg.value as Arg[]).length - 1}
          chainId={chainId}
        />
      ));
    }

    // Bytes with decoded calldata
    if (arg.baseType.includes("bytes") && arg.value) {
      const bytesValue = arg.value as DecodeBytesParamResult;
      if (bytesValue.decoded?.args) {
        const hasDecodedFunction =
          bytesValue.decoded.functionName &&
          bytesValue.decoded.functionName !== "__abi_decoded__";

        return (
          <Box
            position="relative"
            pl={4}
            _before={{
              content: '""',
              position: "absolute",
              left: "10px",
              top: "0",
              bottom: "12px",
              borderLeft: "1px solid",
              borderColor: "whiteAlpha.200",
            }}
          >
            {/* Raw bytes value */}
            <Box
              mb={2}
              position="relative"
              _before={{
                content: '""',
                position: "absolute",
                left: "-14px",
                top: "50%",
                width: "10px",
                borderTop: "1px solid",
                borderColor: "whiteAlpha.200",
              }}
            >
              <TreeBytesParam
                arg={{
                  rawValue: arg.rawValue,
                  value: { decoded: null },
                }}
                chainId={chainId}
              />
            </Box>

            {/* Decoded function container */}
            <Box
              position="relative"
              _before={{
                content: '""',
                position: "absolute",
                left: "-14px",
                top: "20px",
                width: "10px",
                borderTop: "1px solid",
                borderColor: "whiteAlpha.200",
              }}
            >
              <Box
                p={3}
                bg="whiteAlpha.50"
                border="1px solid"
                borderColor="whiteAlpha.100"
                borderLeft="3px solid"
                borderLeftColor="blue.400"
                rounded="md"
              >
                {/* Decoded function header */}
                {hasDecodedFunction && (
                  <HStack spacing={2} mb={3}>
                    <Text fontSize="xs" color="whiteAlpha.500">
                      decoded function
                    </Text>
                    <Text fontSize="md" fontWeight="semibold" color="blue.300">
                      {bytesValue.decoded.functionName}
                    </Text>
                    <Text fontSize="xs" color="whiteAlpha.400">
                      ({bytesValue.decoded.args.length} param
                      {bytesValue.decoded.args.length !== 1 ? "s" : ""})
                    </Text>
                  </HStack>
                )}

                {/* Decoded args */}
                {bytesValue.decoded.args.map((child, i) => (
                  <TreeNode
                    key={`${nodeId}.decoded.${i}`}
                    arg={child}
                    nodeId={`${nodeId}.decoded.${i}`}
                    depth={depth + 1}
                    isLast={i === bytesValue.decoded!.args.length - 1}
                    chainId={chainId}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        );
      }
    }

    return null;
  };

  // Get display label for collapsed view
  const getCollapsedLabel = () => {
    const typeLabel = getChildTypeLabel(arg);
    return typeLabel ? `(${typeLabel})` : "";
  };

  // Line color based on shared hover state (all siblings highlight together)
  const isLineHovered = parentNodeId !== null && hoveredParentId === parentNodeId;
  const lineColor = isLineHovered ? "blue.400" : "whiteAlpha.200";

  return (
    <Box
      position="relative"
      pl={depth > 0 ? 6 : 0}
      opacity={isDimmed ? 0.4 : 1}
      transition="opacity 0.2s ease"
    >
      {/* Clickable tree connector lines */}
      {depth > 0 && parentNodeId && (
        <>
          {/* Vertical line - connecting siblings */}
          <Box
            position="absolute"
            left="0"
            top="0"
            bottom={isLast ? "calc(100% - 12px)" : "0"}
            width="20px"
            cursor="pointer"
            zIndex={1}
            onMouseEnter={() => setHoveredParentId(parentNodeId)}
            onMouseLeave={() => setHoveredParentId(null)}
            onClick={handleLineClick}
            title="Click to toggle parent"
            _before={{
              content: '""',
              position: "absolute",
              left: "6px",
              top: "0",
              bottom: "0",
              borderLeft: "1px solid",
              borderColor: lineColor,
            }}
          />
          {/* Horizontal line - connecting to node */}
          <Box
            position="absolute"
            left="6px"
            top="0"
            width="24px"
            height="24px"
            cursor="pointer"
            zIndex={1}
            onMouseEnter={() => setHoveredParentId(parentNodeId)}
            onMouseLeave={() => setHoveredParentId(null)}
            onClick={handleLineClick}
            title="Click to toggle parent"
            _before={{
              content: '""',
              position: "absolute",
              left: "0",
              top: "12px",
              width: "18px",
              borderTop: "1px solid",
              borderColor: lineColor,
            }}
          />
        </>
      )}
      {/* Non-clickable lines for nodes without parent (e.g., depth > 0 but no function root) */}
      {depth > 0 && !parentNodeId && (
        <>
          <Box
            position="absolute"
            left="6px"
            top="0"
            bottom={isLast ? "calc(100% - 12px)" : "0"}
            borderLeft="1px solid"
            borderColor="whiteAlpha.200"
            pointerEvents="none"
          />
          <Box
            position="absolute"
            left="6px"
            top="12px"
            width="18px"
            borderTop="1px solid"
            borderColor="whiteAlpha.200"
            pointerEvents="none"
          />
        </>
      )}
      {/* Node Header Row */}
      <HStack
        ref={headerRef}
        data-sticky-node={nodeId}
        data-depth={depth}
        data-label={getStickyLabel()}
        data-type={getTypeDisplay()}
        data-basetype={arg.baseType}
        data-isfunction="false"
        data-functionname=""
        data-childcount={childCount}
        spacing={1}
        py={1}
        px={1}
        rounded="sm"
        cursor={hasChildNodes ? "pointer" : "default"}
        onClick={hasChildNodes ? () => toggleNode(nodeId) : undefined}
        _hover={hasChildNodes ? { bg: "whiteAlpha.50" } : undefined}
      >
        {/* Expand/Collapse Toggle */}
        {hasChildNodes ? (
          <Box
            flexShrink={0}
            w={4}
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            {expanded ? (
              <ChevronDownIcon boxSize={3.5} color="whiteAlpha.600" />
            ) : (
              <ChevronRightIcon boxSize={3.5} color="whiteAlpha.600" />
            )}
          </Box>
        ) : (
          <Box w={4} flexShrink={0} />
        )}

        {/* Type Icon */}
        <TypeIcon
          baseType={arg.baseType}
          color={getTypeColor(arg.baseType)}
          boxSize={3}
        />

        {/* Index for array items */}
        {showIndex && index !== undefined && (
          <Text fontSize="xs" color="whiteAlpha.500" fontFamily="mono">
            [{index}]
          </Text>
        )}

        {/* Parameter name (only show in header for expandable nodes) */}
        {arg.name && hasChildNodes && (
          <Text fontSize="sm" fontWeight="medium" color="gray.200">
            {arg.name}
          </Text>
        )}

        {/* Type */}
        <Text fontSize="xs" color="whiteAlpha.500">
          {getTypeDisplay()}
        </Text>

        {/* Collapsed count indicator */}
        {hasChildNodes && !expanded && (
          <Text fontSize="xs" color="blue.300">
            {getCollapsedLabel()}
          </Text>
        )}

        {/* External link for address types */}
        {(arg.baseType === "address" ||
          (arg.baseType === "bytes" && isAddress(arg.rawValue))) && (
          <Link
            href={`${getPath(
              subdomains.EXPLORER.base,
              subdomains.EXPLORER.isRelativePath
            )}address/${arg.baseType === "address" ? arg.value : arg.rawValue}`}
            title="View on explorer"
            isExternal
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLinkIcon boxSize={3} color="blue.400" />
          </Link>
        )}
      </HStack>

      {/* Leaf value (shown below header for non-expandable nodes) */}
      {!hasChildNodes && (
        <Box pl={6} pb={1}>
          {/* Show parameter name prominently for leaf nodes (address handles its own name inline with tags) */}
          {arg.name && arg.baseType !== "address" && (
            <Text fontSize="md" fontWeight="medium" color="white" mb={1}>
              {arg.name}
            </Text>
          )}
          {renderLeafValue()}
        </Box>
      )}

      {/* Expanded children */}
      <Collapse in={expanded} animateOpacity>
        <Box>{renderChildren()}</Box>
      </Collapse>
    </Box>
  );
}
