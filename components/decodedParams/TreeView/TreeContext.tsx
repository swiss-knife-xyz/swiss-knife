"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
  RefObject,
} from "react";
import { Arg, DecodeBytesParamResult } from "@/types";

type NodeInfo = {
  depth: number;
  childCount: number;
};

// Metadata for sticky header rendering
export type StickyNodeMeta = {
  nodeId: string;
  depth: number;
  label: string; // Parameter name or index
  type: string; // Type display string
  baseType: string; // Base type for icon
  isFunction?: boolean; // Is this a function header
  functionName?: string; // Function name if applicable
  childCount?: number; // Number of children
  element: HTMLElement | null; // Reference to the DOM element
};

type TreeContextType = {
  expandedNodes: Set<string>;
  toggleNode: (nodeId: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  isExpanded: (nodeId: string) => boolean;
  registerNode: (nodeId: string, depth: number, childCount: number) => void;
  allNodeIds: string[];
  focusedNodeId: string | null;
  setFocusedNodeId: (nodeId: string | null) => void;
  // Sticky header support
  registerStickyNode: (meta: StickyNodeMeta) => void;
  unregisterStickyNode: (nodeId: string) => void;
  stickyNodes: Map<string, StickyNodeMeta>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  visibleStickyHeaders: StickyNodeMeta[];
  setVisibleStickyHeaders: (headers: StickyNodeMeta[]) => void;
};

const TreeContext = createContext<TreeContextType | null>(null);

export function useTreeContext() {
  const context = useContext(TreeContext);
  if (!context) {
    throw new Error("useTreeContext must be used within a TreeProvider");
  }
  return context;
}

// Count descendants of an arg for smart collapse logic
export function countDescendants(arg: Arg): number {
  if (arg.baseType === "array" && Array.isArray(arg.value)) {
    return (arg.value as Arg[]).reduce(
      (sum, item) => sum + 1 + countDescendants(item),
      0
    );
  }
  if (arg.baseType === "tuple" && Array.isArray(arg.value)) {
    return (arg.value as Arg[]).reduce(
      (sum, item) => sum + 1 + countDescendants(item),
      0
    );
  }
  // Check for decoded bytes (nested calldata)
  if (arg.baseType.includes("bytes") && arg.value) {
    const bytesValue = arg.value as DecodeBytesParamResult;
    if (bytesValue.decoded?.args) {
      return bytesValue.decoded.args.reduce(
        (sum, item) => sum + 1 + countDescendants(item),
        0
      );
    }
  }
  return 0;
}

// Determine if a node should be expanded by default
export function shouldExpandByDefault(_depth: number, _arg: Arg): boolean {
  // Expand all nodes by default
  return true;
}

// Check if an arg has nested children
export function hasChildren(arg: Arg): boolean {
  if (arg.baseType === "array" && Array.isArray(arg.value)) {
    return (arg.value as Arg[]).length > 0;
  }
  if (arg.baseType === "tuple" && Array.isArray(arg.value)) {
    return (arg.value as Arg[]).length > 0;
  }
  if (arg.baseType.includes("bytes") && arg.value) {
    const bytesValue = arg.value as DecodeBytesParamResult;
    return bytesValue.decoded !== null;
  }
  return false;
}

// Get children count for display
export function getChildrenCount(arg: Arg): number {
  if (arg.baseType === "array" && Array.isArray(arg.value)) {
    return (arg.value as Arg[]).length;
  }
  if (arg.baseType === "tuple" && Array.isArray(arg.value)) {
    return (arg.value as Arg[]).length;
  }
  if (arg.baseType.includes("bytes") && arg.value) {
    const bytesValue = arg.value as DecodeBytesParamResult;
    return bytesValue.decoded?.args?.length ?? 0;
  }
  return 0;
}

// Get child type label for display
export function getChildTypeLabel(arg: Arg): string {
  if (arg.baseType === "array") {
    const count = getChildrenCount(arg);
    return `${count} item${count !== 1 ? "s" : ""}`;
  }
  if (arg.baseType === "tuple") {
    const count = getChildrenCount(arg);
    return `${count} field${count !== 1 ? "s" : ""}`;
  }
  if (arg.baseType.includes("bytes")) {
    const bytesValue = arg.value as DecodeBytesParamResult;
    if (bytesValue?.decoded) {
      return "decoded calldata";
    }
  }
  return "";
}

interface TreeProviderProps {
  children: ReactNode;
  args: Arg[];
  functionName?: string;
}

export function TreeProvider({ children, args, functionName }: TreeProviderProps) {
  const [nodeRegistry] = useState<Map<string, NodeInfo>>(new Map());
  const hasFunctionRoot = functionName && functionName !== "__abi_decoded__";
  
  // Sticky header support - use ref since we don't need re-renders on registration
  const stickyNodesRef = useRef<Map<string, StickyNodeMeta>>(new Map());
  const [visibleStickyHeaders, setVisibleStickyHeaders] = useState<StickyNodeMeta[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const registerStickyNode = useCallback((meta: StickyNodeMeta) => {
    stickyNodesRef.current.set(meta.nodeId, meta);
  }, []);
  
  const unregisterStickyNode = useCallback((nodeId: string) => {
    stickyNodesRef.current.delete(nodeId);
  }, []);
  
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    // Calculate initial expanded state based on smart collapse logic
    const initialExpanded = new Set<string>();

    // If we have a function name, expand the root by default
    if (hasFunctionRoot) {
      initialExpanded.add("root");
    }

    function processArgs(args: Arg[], parentPath: string, depth: number) {
      args.forEach((arg, index) => {
        const nodeId = parentPath ? `${parentPath}.${index}` : `${index}`;

        if (hasChildren(arg) && shouldExpandByDefault(depth, arg)) {
          initialExpanded.add(nodeId);
        }

        // Recursively process children
        if (arg.baseType === "array" && Array.isArray(arg.value)) {
          processArgs(arg.value as Arg[], nodeId, depth + 1);
        } else if (arg.baseType === "tuple" && Array.isArray(arg.value)) {
          processArgs(arg.value as Arg[], nodeId, depth + 1);
        } else if (arg.baseType.includes("bytes") && arg.value) {
          const bytesValue = arg.value as DecodeBytesParamResult;
          if (bytesValue.decoded?.args) {
            processArgs(bytesValue.decoded.args, nodeId, depth + 1);
          }
        }
      });
    }

    // Start processing from depth 1 if we have a function root, else from 0
    processArgs(args, "", hasFunctionRoot ? 1 : 0);
    return initialExpanded;
  });

  const [allNodeIds, setAllNodeIds] = useState<string[]>([]);

  const registerNode = useCallback(
    (nodeId: string, depth: number, childCount: number) => {
      if (!nodeRegistry.has(nodeId)) {
        nodeRegistry.set(nodeId, { depth, childCount });
        setAllNodeIds((prev) => {
          if (!prev.includes(nodeId)) {
            return [...prev, nodeId];
          }
          return prev;
        });
      }
    },
    [nodeRegistry]
  );

  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const focusTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const setFocusWithTimeout = useCallback((nodeId: string | null) => {
    // Clear any existing timeout
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
    }
    
    setFocusedNodeId(nodeId);
    
    // Auto-clear focus after 2 seconds
    if (nodeId !== null) {
      focusTimeoutRef.current = setTimeout(() => {
        setFocusedNodeId(null);
      }, 2000);
    }
  }, []);

  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
    setFocusWithTimeout(nodeId);
  }, [setFocusWithTimeout]);

  const expandAll = useCallback(() => {
    setExpandedNodes(new Set(allNodeIds));
    setFocusedNodeId(null);
  }, [allNodeIds]);

  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set());
    setFocusedNodeId(null);
  }, []);

  const isExpanded = useCallback(
    (nodeId: string) => {
      return expandedNodes.has(nodeId);
    },
    [expandedNodes]
  );

  const value = useMemo(
    () => ({
      expandedNodes,
      toggleNode,
      expandAll,
      collapseAll,
      isExpanded,
      registerNode,
      allNodeIds,
      focusedNodeId,
      setFocusedNodeId,
      // Sticky header support
      registerStickyNode,
      unregisterStickyNode,
      stickyNodes: stickyNodesRef.current,
      scrollContainerRef,
      visibleStickyHeaders,
      setVisibleStickyHeaders,
    }),
    [
      expandedNodes,
      toggleNode,
      expandAll,
      collapseAll,
      isExpanded,
      registerNode,
      allNodeIds,
      focusedNodeId,
      registerStickyNode,
      unregisterStickyNode,
      visibleStickyHeaders,
    ]
  );

  return <TreeContext.Provider value={value}>{children}</TreeContext.Provider>;
}
