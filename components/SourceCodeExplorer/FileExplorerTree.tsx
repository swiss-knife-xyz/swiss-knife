"use client";

import { useState, useRef, useEffect } from "react";
import { Box, HStack, Text, Icon, VStack, Collapse } from "@chakra-ui/react";
import { ChevronDownIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { FaFolder, FaFolderOpen } from "react-icons/fa";
import { SiSolidity } from "react-icons/si";
import { FileText, Star } from "lucide-react";
import { FileNode, DiffStats } from "./types";

interface FileExplorerTreeProps {
  data: FileNode[];
  onFileSelect: (path: string, content: string) => void;
  selectedPath?: string;
  height?: number | string;
  /** Map of file paths to their diff stats */
  changedFiles?: Map<string, DiffStats>;
}

interface TreeNodeProps {
  node: FileNode;
  depth: number;
  selectedPath?: string;
  onFileSelect: (path: string, content: string) => void;
  defaultOpen?: boolean;
  changedFiles?: Map<string, DiffStats>;
}

function TreeNode({ node, depth, selectedPath, onFileSelect, defaultOpen = true, changedFiles }: TreeNodeProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const rowRef = useRef<HTMLDivElement>(null);
  const isFolder = Array.isArray(node.children);
  const isSelected = selectedPath === node.path;
  const isTarget = node.isTarget;
  const diffStats = !isFolder ? changedFiles?.get(node.path) : undefined;

  // Scroll the selected file into view
  useEffect(() => {
    if (isSelected && !isFolder && rowRef.current) {
      rowRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [isSelected, isFolder]);

  const handleClick = () => {
    if (isFolder) {
      setIsOpen(!isOpen);
    } else if (node.content !== undefined) {
      onFileSelect(node.path, node.content);
    }
  };

  return (
    <Box>
      <HStack
        ref={rowRef}
        spacing={1}
        py={0.5}
        px={2}
        pl={`${depth * 16 + 8}px`}
        cursor="pointer"
        bg={isSelected ? "whiteAlpha.200" : "transparent"}
        _hover={{ bg: isSelected ? "whiteAlpha.200" : "whiteAlpha.100" }}
        borderRadius="sm"
        onClick={handleClick}
        userSelect="none"
      >
        {/* Expand/collapse icon for folders */}
        {isFolder ? (
          <Icon
            as={isOpen ? ChevronDownIcon : ChevronRightIcon}
            boxSize={3}
            color="text.tertiary"
          />
        ) : (
          <Box w={3} />
        )}

        {/* Folder/file icon */}
        {isFolder ? (
          <Icon
            as={isOpen ? FaFolderOpen : FaFolder}
            boxSize={3.5}
            color="orange.300"
            opacity={0.8}
          />
        ) : node.name.endsWith(".sol") ? (
          <Icon as={SiSolidity} boxSize={3.5} color="blue.400" />
        ) : (
          <Icon as={FileText} boxSize={3.5} color="text.tertiary" />
        )}

        {/* Diff stats indicator - after file icon */}
        {diffStats && (
          <HStack spacing={0.5} flexShrink={0}>
            <Text fontSize="9px" color="green.400" fontWeight="semibold" lineHeight="1">
              +{diffStats.linesAdded}
            </Text>
            <Text fontSize="9px" color="red.400" fontWeight="semibold" lineHeight="1">
              -{diffStats.linesRemoved}
            </Text>
          </HStack>
        )}

        {/* File/folder name */}
        <Text
          fontSize="xs"
          color={isSelected ? "text.primary" : "text.secondary"}
          fontWeight={isTarget ? "semibold" : "normal"}
          isTruncated
          flex={1}
        >
          {node.name}
        </Text>

        {/* Target indicator */}
        {isTarget && (
          <Icon as={Star} boxSize={3} color="yellow.400" fill="yellow.400" />
        )}
      </HStack>

      {/* Children */}
      {isFolder && node.children && (
        <Collapse in={isOpen} animateOpacity>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onFileSelect={onFileSelect}
              defaultOpen={defaultOpen}
              changedFiles={changedFiles}
            />
          ))}
        </Collapse>
      )}
    </Box>
  );
}

export function FileExplorerTree({
  data,
  onFileSelect,
  selectedPath,
  height = 350,
  changedFiles,
}: FileExplorerTreeProps) {
  const h = typeof height === "string" ? height : `${height}px`;

  if (!data || data.length === 0) {
    return (
      <Box h={h} p={4}>
        <Text color="text.tertiary" fontSize="sm">No files</Text>
      </Box>
    );
  }

  return (
    <Box
      h={h}
      overflow="auto"
      css={{
        "&::-webkit-scrollbar": {
          width: "6px",
          height: "6px",
        },
        "&::-webkit-scrollbar-thumb": {
          background: "rgba(255,255,255,0.2)",
          borderRadius: "3px",
        },
      }}
    >
      <VStack spacing={0} align="stretch" minW="max-content">
        {data.map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            depth={0}
            selectedPath={selectedPath}
            onFileSelect={onFileSelect}
            defaultOpen={true}
            changedFiles={changedFiles}
          />
        ))}
      </VStack>
    </Box>
  );
}
