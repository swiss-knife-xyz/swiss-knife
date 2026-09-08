import { FileNode } from "./types";

/**
 * Builds a hierarchical file tree from flat file paths
 */
export function buildFileTree(
  sources: Record<string, string>,
  targetFileName?: string
): FileNode[] {
  if (!sources || Object.keys(sources).length === 0) {
    return [];
  }

  const root: FileNode[] = [];
  const nodeMap = new Map<string, FileNode>();

  // Sort paths to ensure consistent ordering (folders first, then files)
  const sortedPaths = Object.keys(sources).sort((a, b) => {
    const aDepth = a.split("/").length;
    const bDepth = b.split("/").length;
    if (aDepth !== bDepth) return aDepth - bDepth;
    return a.localeCompare(b);
  });

  for (const filePath of sortedPaths) {
    const parts = filePath.split("/");
    let currentPath = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (!nodeMap.has(currentPath)) {
        const isTarget = isFile && targetFileName ? filePath.endsWith(targetFileName) : false;

        // Create node - folders have children array, files don't
        const node: FileNode = isFile
          ? {
              id: String(currentPath),
              name: part,
              path: currentPath,
              content: sources[filePath],
              isTarget,
            }
          : {
              id: String(currentPath),
              name: part,
              path: currentPath,
              children: [],
              isTarget: false,
            };

        nodeMap.set(currentPath, node);

        if (parentPath) {
          const parent = nodeMap.get(parentPath);
          if (parent && parent.children) {
            parent.children.push(node);
          }
        } else {
          root.push(node);
        }
      }
    }
  }

  // Sort children: folders first, then files, alphabetically
  const sortNodes = (nodes: FileNode[]): FileNode[] => {
    return nodes
      .sort((a, b) => {
        const aIsFolder = Array.isArray(a.children);
        const bIsFolder = Array.isArray(b.children);
        if (aIsFolder && !bIsFolder) return -1;
        if (!aIsFolder && bIsFolder) return 1;
        return a.name.localeCompare(b.name);
      })
      .map((node) => {
        if (Array.isArray(node.children)) {
          return { ...node, children: sortNodes(node.children) };
        }
        return node;
      });
  };

  // Remove empty folders (folders with no files, directly or recursively)
  // Also removes folders with empty names
  const removeEmptyFolders = (nodes: FileNode[]): FileNode[] => {
    return nodes
      .filter((node) => {
        // Remove nodes with empty names
        if (!node.name || node.name.trim() === "") return false;

        // Keep files
        if (!Array.isArray(node.children)) return true;

        // For folders, recursively filter children first
        node.children = removeEmptyFolders(node.children);

        // Keep folder only if it has children after filtering
        return node.children.length > 0;
      });
  };

  // Collapse single-child folder chains (VS Code-style compact folders)
  // e.g., Users > aloysius.chan > Repositories > contracts becomes
  // Users/aloysius.chan/Repositories > contracts (if contracts has multiple children)
  const collapseSingleChildFolders = (nodes: FileNode[]): FileNode[] => {
    return nodes.map((node) => {
      if (!Array.isArray(node.children)) return node;

      // Recursively collapse children first
      node.children = collapseSingleChildFolders(node.children);

      // If this folder has exactly one child and that child is also a folder,
      // merge them into a single node
      while (
        node.children &&
        node.children.length === 1 &&
        Array.isArray(node.children[0].children)
      ) {
        const child = node.children[0];
        node = {
          ...node,
          name: `${node.name}/${child.name}`,
          path: child.path,
          children: child.children,
        };
      }

      return node;
    });
  };

  return collapseSingleChildFolders(removeEmptyFolders(sortNodes(root)));
}

/**
 * Find the target file (main contract) in the source code
 */
export function findTargetFile(
  sources: Record<string, string>,
  contractName?: string
): string | undefined {
  const paths = Object.keys(sources);

  // If contract name provided, try to find matching file
  if (contractName) {
    const targetPath = paths.find(
      p => p.endsWith(`${contractName}.sol`) || p.includes(`/${contractName}.sol`)
    );
    if (targetPath) return targetPath;
  }

  // Fallback: find main contract file (usually shortest path or first .sol file)
  const solFiles = paths.filter(p => p.endsWith(".sol"));
  if (solFiles.length === 0) return paths[0];

  // Prefer files in root or contracts folder
  const priorityFile = solFiles.find(
    p => !p.includes("@") && !p.includes("node_modules") &&
         (p.split("/").length <= 2 || p.includes("contracts/"))
  );

  return priorityFile || solFiles[0];
}

/**
 * Get language for Monaco based on file extension
 */
export function getLanguageForFile(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "sol":
      return "sol";
    case "vy":
      return "python"; // Vyper uses Python-like syntax
    case "json":
      return "json";
    case "js":
    case "jsx":
      return "javascript";
    case "ts":
    case "tsx":
      return "typescript";
    case "md":
      return "markdown";
    default:
      return "plaintext";
  }
}

/**
 * Detect language from source code content when file extension is unavailable.
 * Checks for Solidity or Vyper patterns in the code.
 */
export function detectLanguageFromContent(content: string): string {
  const trimmed = content.trimStart();
  // Solidity: starts with pragma solidity, or contains contract/interface/library declarations
  if (
    /^\/\/\s*SPDX-License-Identifier/m.test(trimmed) ||
    /^\s*pragma\s+solidity/m.test(trimmed) ||
    /^\s*(?:abstract\s+)?contract\s+\w+/m.test(trimmed) ||
    /^\s*interface\s+\w+/m.test(trimmed) ||
    /^\s*library\s+\w+/m.test(trimmed)
  ) {
    return "sol";
  }
  // Vyper: uses @external, @internal decorators or version pragma
  if (
    /^#\s*@version/m.test(trimmed) ||
    /^\s*@external/m.test(trimmed) ||
    /^\s*@internal/m.test(trimmed) ||
    /^#\s*pragma\s+version/m.test(trimmed)
  ) {
    return "python";
  }
  return "plaintext";
}
