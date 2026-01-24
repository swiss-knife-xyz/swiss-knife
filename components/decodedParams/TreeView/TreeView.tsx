"use client";

import React, { useEffect, useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Box, HStack, Button, Icon, Text, Collapse } from "@chakra-ui/react";
import { FiMaximize2, FiMinimize2, FiTerminal } from "react-icons/fi";
import { ChevronDownIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { Arg } from "@/types";
import { TreeProvider, useTreeContext, StickyNodeMeta } from "./TreeContext";
import { TreeNode } from "./TreeNode";
import { TypeIcon, getTypeColor } from "./TypeIcon";

interface TreeViewProps {
  args: Arg[];
  chainId?: number;
  functionName?: string;
}

function TreeControls() {
  const { expandAll, collapseAll, allNodeIds } = useTreeContext();

  // Only show controls if there are expandable nodes
  if (allNodeIds.length === 0) {
    return null;
  }

  return (
    <HStack spacing={1} mb={2} justify="flex-end">
      <Button
        size="xs"
        variant="ghost"
        leftIcon={<Icon as={FiMaximize2} boxSize={3} />}
        onClick={expandAll}
        color="whiteAlpha.700"
        _hover={{ bg: "whiteAlpha.100", color: "white" }}
        fontWeight="normal"
        fontSize="xs"
      >
        Expand All
      </Button>
      <Button
        size="xs"
        variant="ghost"
        leftIcon={<Icon as={FiMinimize2} boxSize={3} />}
        onClick={collapseAll}
        color="whiteAlpha.700"
        _hover={{ bg: "whiteAlpha.100", color: "white" }}
        fontWeight="normal"
        fontSize="xs"
      >
        Collapse All
      </Button>
    </HStack>
  );
}

// Sticky header row component - padding matches the tree content (parent has p={4} = 16px)
function StickyHeaderRow({
  meta,
  onClick,
}: {
  meta: StickyNodeMeta;
  onClick?: () => void;
}) {
  // Base left padding to account for parent container's padding
  const basePadding = 16; // matches p={4} from parent Box in CalldataDecoderPage

  if (meta.isFunction) {
    return (
      <HStack
        spacing={2}
        py={1.5}
        pr={4}
        pl={`${basePadding + 8}px`}
        cursor="pointer"
        onClick={onClick}
        _hover={{ bg: "whiteAlpha.50" }}
      >
        <Icon as={FiTerminal} boxSize={4} color="green.400" />
        <Text fontSize="sm" fontWeight="semibold" color="green.300">
          {meta.functionName}
        </Text>
        <Text fontSize="xs" color="whiteAlpha.500">
          ({meta.childCount} param{meta.childCount !== 1 ? "s" : ""})
        </Text>
      </HStack>
    );
  }

  return (
    <HStack
      spacing={1}
      py={1}
      pr={4}
      pl={`${basePadding + meta.depth * 24 + 8}px`}
      cursor="pointer"
      onClick={onClick}
      _hover={{ bg: "whiteAlpha.50" }}
    >
      <ChevronDownIcon boxSize={3.5} color="whiteAlpha.600" />
      <TypeIcon
        baseType={meta.baseType}
        color={getTypeColor(meta.baseType)}
        boxSize={3}
      />
      {meta.label && (
        <Text fontSize="xs" color="gray.200" fontWeight="medium">
          {meta.label}
        </Text>
      )}
      <Text fontSize="xs" color="whiteAlpha.500">
        {meta.type}
      </Text>
    </HStack>
  );
}

// Sticky headers container - uses Portal + fixed positioning
function StickyHeaders() {
  const { visibleStickyHeaders, scrollContainerRef } = useTreeContext();
  const [containerBounds, setContainerBounds] = useState<{
    left: number;
    width: number;
    top: number;
    bottom: number;
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  // Only render portal after mount (for SSR compatibility)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update container bounds on scroll/resize
  // We need to measure the parent container that has the padding (p={4}) for correct width
  useEffect(() => {
    const updateBounds = () => {
      const containerEl = scrollContainerRef.current;
      if (!containerEl) return;

      // Get the parent container with padding (the Box wrapping TreeView in CalldataDecoderPage)
      // This ensures the sticky header width matches the visual container
      const parentWithPadding =
        (containerEl.closest("[data-tree-wrapper]") as HTMLElement) ||
        (containerEl.parentElement?.parentElement as HTMLElement) ||
        containerEl;

      const rect = parentWithPadding.getBoundingClientRect();
      setContainerBounds({
        left: rect.left,
        width: rect.width,
        top: rect.top,
        bottom: rect.bottom,
      });
    };

    updateBounds();
    window.addEventListener("scroll", updateBounds, { passive: true });
    window.addEventListener("resize", updateBounds, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateBounds);
      window.removeEventListener("resize", updateBounds);
    };
  }, [scrollContainerRef]);

  // Don't render on server or if no headers/bounds
  if (!mounted || visibleStickyHeaders.length === 0 || !containerBounds) {
    return null;
  }

  // Hide if the container has scrolled completely out of view
  const headerHeight = visibleStickyHeaders.length * 28;
  if (
    containerBounds.bottom < headerHeight ||
    containerBounds.top > window.innerHeight
  ) {
    return null;
  }

  const handleHeaderClick = (meta: StickyNodeMeta) => {
    if (meta.element) {
      const elementRect = meta.element.getBoundingClientRect();
      const scrollTarget = window.scrollY + elementRect.top - headerHeight;
      window.scrollTo({
        top: scrollTarget,
        behavior: "smooth",
      });
    }
  };

  // Use Portal to render directly to body, bypassing any parent transforms/filters
  // Match the exact position and width of the parent container (which has p={4})
  const stickyContent = (
    <Box
      position="fixed"
      top={0}
      left={`${containerBounds.left}px`}
      width={`${containerBounds.width}px`}
      zIndex={10000}
      borderBottom="1px solid"
      borderColor="whiteAlpha.200"
      bg="#131314"
      borderRadius="lg"
      boxShadow="0 2px 8px rgba(0,0,0,0.5)"
      pt={4}
      pb={2}
    >
      {visibleStickyHeaders.map((meta) => (
        <StickyHeaderRow
          key={meta.nodeId}
          meta={meta}
          onClick={() => handleHeaderClick(meta)}
        />
      ))}
    </Box>
  );

  return createPortal(stickyContent, document.body);
}

function FunctionRootNode({
  functionName,
  args,
  chainId,
  showControls,
}: {
  functionName: string;
  args: Arg[];
  chainId?: number;
  showControls?: boolean;
}) {
  const {
    isExpanded,
    toggleNode,
    registerNode,
    registerStickyNode,
    unregisterStickyNode,
    expandAll,
    collapseAll,
    allNodeIds,
  } = useTreeContext();
  const nodeId = "root";
  const expanded = isExpanded(nodeId);
  const headerRef = useRef<HTMLDivElement>(null);

  // Register the root node
  useEffect(() => {
    registerNode(nodeId, 0, args.length);
  }, [args.length, registerNode]);

  // Register for sticky headers
  useEffect(() => {
    registerStickyNode({
      nodeId,
      depth: 0,
      label: "",
      type: "",
      baseType: "function",
      isFunction: true,
      functionName,
      childCount: args.length,
      element: headerRef.current,
    });
    return () => unregisterStickyNode(nodeId);
  }, [
    nodeId,
    functionName,
    args.length,
    registerStickyNode,
    unregisterStickyNode,
  ]);

  const hasExpandableNodes = allNodeIds.length > 0;

  return (
    <Box>
      {/* Function Header Row - Prominent */}
      <HStack
        ref={headerRef}
        data-sticky-node={nodeId}
        data-depth="0"
        data-label=""
        data-type=""
        data-basetype="function"
        data-isfunction="true"
        data-functionname={functionName}
        data-childcount={args.length}
        spacing={0}
        py={2}
        px={2}
        mb={2}
        rounded="md"
        justify="space-between"
        align="center"
      >
        {/* Left side: Function name (clickable) */}
        <HStack
          spacing={3}
          cursor="pointer"
          onClick={() => toggleNode(nodeId)}
          _hover={{ bg: "whiteAlpha.100" }}
          py={1}
          px={1}
          rounded="md"
          flex="1"
        >
          {/* Expand/Collapse Toggle */}
          <Box
            flexShrink={0}
            w={6}
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            {expanded ? (
              <ChevronDownIcon boxSize={6} color="whiteAlpha.700" />
            ) : (
              <ChevronRightIcon boxSize={6} color="whiteAlpha.700" />
            )}
          </Box>

          {/* Function Icon */}
          <Icon as={FiTerminal} boxSize={6} color="green.400" />

          {/* Function name */}
          <Text fontSize="xl" fontWeight="bold" color="green.300">
            {functionName}
          </Text>

          {/* Param count */}
          <Text fontSize="sm" color="whiteAlpha.500">
            ({args.length} param{args.length !== 1 ? "s" : ""})
          </Text>
        </HStack>

        {/* Right side: Expand/Collapse All controls */}
        {showControls && hasExpandableNodes && (
          <HStack spacing={1} flexShrink={0}>
            <Button
              size="xs"
              variant="ghost"
              leftIcon={<Icon as={FiMaximize2} boxSize={3} />}
              onClick={(e) => {
                e.stopPropagation();
                expandAll();
              }}
              color="whiteAlpha.700"
              _hover={{ bg: "whiteAlpha.100", color: "white" }}
              fontWeight="normal"
              fontSize="xs"
            >
              Expand All
            </Button>
            <Button
              size="xs"
              variant="ghost"
              leftIcon={<Icon as={FiMinimize2} boxSize={3} />}
              onClick={(e) => {
                e.stopPropagation();
                collapseAll();
              }}
              color="whiteAlpha.700"
              _hover={{ bg: "whiteAlpha.100", color: "white" }}
              fontWeight="normal"
              fontSize="xs"
            >
              Collapse All
            </Button>
          </HStack>
        )}
      </HStack>

      {/* Children */}
      <Collapse in={expanded} animateOpacity>
        <Box pl={6}>
          {args.map((arg, index) => (
            <TreeNode
              key={index}
              arg={arg}
              nodeId={`${index}`}
              depth={1}
              isLast={index === args.length - 1}
              chainId={chainId}
            />
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}

// Helper to check if nodeId is a descendant of parentId
function isDescendantOf(nodeId: string, parentId: string): boolean {
  if (parentId === "root") {
    // Direct children of root have IDs like "0", "1", etc.
    return nodeId !== "root";
  }
  return (
    nodeId.startsWith(parentId + ".") ||
    nodeId.startsWith(parentId + ".decoded.")
  );
}

// Hook to handle scroll-based sticky header updates (uses window scroll)
// Reads all metadata directly from DOM data attributes for reliability
function useStickyScroll() {
  const { scrollContainerRef, setVisibleStickyHeaders, expandedNodes } =
    useTreeContext();
  const rafRef = useRef<number>();

  const updateStickyHeaders = useCallback(() => {
    const container = scrollContainerRef.current;

    console.log("[StickyScroll] updateStickyHeaders called");
    console.log("[StickyScroll] container:", container);
    console.log("[StickyScroll] expandedNodes:", Array.from(expandedNodes));

    if (!container) {
      // Fallback: try to find elements in the whole document
      const fallbackElements =
        document.querySelectorAll<HTMLElement>("[data-sticky-node]");
      console.log(
        "[StickyScroll] No container, fallback elements:",
        fallbackElements.length
      );
      if (fallbackElements.length === 0) return;
    }

    // Query all sticky node elements directly from DOM
    const stickyElements = (
      container || document
    ).querySelectorAll<HTMLElement>("[data-sticky-node]");
    console.log("[StickyScroll] Found sticky elements:", stickyElements.length);

    // Build node positions from DOM elements using VIEWPORT coordinates
    const nodePositions: {
      element: HTMLElement;
      nodeId: string;
      depth: number;
      label: string;
      type: string;
      baseType: string;
      isFunction: boolean;
      functionName: string;
      childCount: number;
      headerTop: number;
      contentBottom: number;
    }[] = [];

    stickyElements.forEach((element) => {
      const nodeId = element.getAttribute("data-sticky-node");
      if (!nodeId) return;

      // Read metadata from data attributes
      const depth = parseInt(element.getAttribute("data-depth") || "0", 10);
      const label = element.getAttribute("data-label") || "";
      const type = element.getAttribute("data-type") || "";
      const baseType = element.getAttribute("data-basetype") || "";
      const isFunction = element.getAttribute("data-isfunction") === "true";
      const functionName = element.getAttribute("data-functionname") || "";
      const childCount = parseInt(
        element.getAttribute("data-childcount") || "0",
        10
      );

      // Only process nodes that have children (indicated by data-childcount > 0 or isfunction)
      if (childCount === 0 && !isFunction) {
        console.log("[StickyScroll] Skipping leaf node:", nodeId);
        return;
      }

      // Check if expanded (node must be in expandedNodes to show as sticky)
      if (!expandedNodes.has(nodeId)) {
        console.log("[StickyScroll] Skipping collapsed node:", nodeId);
        return;
      }

      const headerRect = element.getBoundingClientRect();
      const headerTop = headerRect.top;

      // Find the wrapper element (parent Box)
      const wrapper = element.parentElement;
      const contentBottom = wrapper
        ? wrapper.getBoundingClientRect().bottom
        : headerTop + 1000;

      console.log(
        "[StickyScroll] Node:",
        nodeId,
        "headerTop:",
        headerTop,
        "contentBottom:",
        contentBottom,
        "isFunction:",
        isFunction
      );

      nodePositions.push({
        element,
        nodeId,
        depth,
        label,
        type,
        baseType,
        isFunction,
        functionName,
        childCount,
        headerTop,
        contentBottom,
      });
    });

    console.log("[StickyScroll] Valid node positions:", nodePositions.length);

    // Sort by depth first, then by viewport position
    nodePositions.sort(
      (a, b) => a.depth - b.depth || a.headerTop - b.headerTop
    );

    // Calculate which headers should be sticky
    const visibleHeaders: StickyNodeMeta[] = [];
    const headerHeight = 28;

    for (const node of nodePositions) {
      const currentStickyHeight = visibleHeaders.length * headerHeight;

      // A header becomes sticky when its top edge goes above the current sticky area
      const isPastTop = node.headerTop < currentStickyHeight;
      const isContentStillVisible =
        node.contentBottom > currentStickyHeight + headerHeight;

      console.log(
        "[StickyScroll] Checking:",
        node.nodeId,
        "isPastTop:",
        isPastTop,
        "(headerTop:",
        node.headerTop,
        "< stickyHeight:",
        currentStickyHeight,
        ")",
        "isContentStillVisible:",
        isContentStillVisible
      );

      if (isPastTop && isContentStillVisible) {
        const meta: StickyNodeMeta = {
          nodeId: node.nodeId,
          depth: node.depth,
          label: node.label,
          type: node.type,
          baseType: node.baseType,
          isFunction: node.isFunction,
          functionName: node.functionName,
          childCount: node.childCount,
          element: node.element,
        };

        // Check ancestry - build a proper chain
        if (node.nodeId === "root") {
          visibleHeaders.push(meta);
          console.log("[StickyScroll] Added root to visible headers");
        } else if (visibleHeaders.length > 0) {
          const lastHeader = visibleHeaders[visibleHeaders.length - 1];
          if (isDescendantOf(node.nodeId, lastHeader.nodeId)) {
            visibleHeaders.push(meta);
            console.log("[StickyScroll] Added descendant:", node.nodeId);
          }
        } else {
          // If no headers yet but this isn't root, still add it (for non-function trees)
          visibleHeaders.push(meta);
          console.log(
            "[StickyScroll] Added non-root first header:",
            node.nodeId
          );
        }
      }
    }

    console.log(
      "[StickyScroll] Final visible headers:",
      visibleHeaders.map((h) => h.nodeId)
    );
    setVisibleStickyHeaders(visibleHeaders);
  }, [scrollContainerRef, setVisibleStickyHeaders, expandedNodes]);

  const handleScroll = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(updateStickyHeaders);
  }, [updateStickyHeaders]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    const timeoutId = setTimeout(updateStickyHeaders, 100);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(timeoutId);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [handleScroll, updateStickyHeaders]);

  useEffect(() => {
    const timeoutId = setTimeout(updateStickyHeaders, 100);
    return () => clearTimeout(timeoutId);
  }, [expandedNodes, updateStickyHeaders]);
}

function TreeContent({
  args,
  chainId,
  functionName,
}: {
  args: Arg[];
  chainId?: number;
  functionName?: string;
}) {
  const { scrollContainerRef } = useTreeContext();

  // Set up sticky scroll handling
  useStickyScroll();

  // If we have a function name, render it as root with args as children
  if (functionName && functionName !== "__abi_decoded__") {
    return (
      <Box>
        <Box
          ref={scrollContainerRef}
          position="relative"
          data-tree-container="true"
        >
          <StickyHeaders />
          <FunctionRootNode
            functionName={functionName}
            args={args}
            chainId={chainId}
            showControls
          />
        </Box>
      </Box>
    );
  }

  // Otherwise render args at root level (for events or abi.decode results)
  return (
    <Box>
      <TreeControls />
      <Box
        ref={scrollContainerRef}
        position="relative"
        data-tree-container="true"
      >
        <StickyHeaders />
        <Box>
          {args.map((arg, index) => (
            <TreeNode
              key={index}
              arg={arg}
              nodeId={`${index}`}
              depth={0}
              isLast={index === args.length - 1}
              chainId={chainId}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}

export function TreeView({ args, chainId, functionName }: TreeViewProps) {
  return (
    <TreeProvider args={args} functionName={functionName}>
      <TreeContent args={args} chainId={chainId} functionName={functionName} />
    </TreeProvider>
  );
}
