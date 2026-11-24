"use client";
import { revealExplorerRow } from "./revealExplorerRow";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { Box, HStack, Text, Icon, VStack } from "@chakra-ui/react";
import { ChevronDownIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { FaFolder, FaFolderOpen } from "react-icons/fa";
import { SiSolidity } from "react-icons/si";
import { FileText, Star } from "lucide-react";
import type { FileNode, DiffStats } from "./types";

export interface FileExplorerTreeProps {
  data: FileNode[];
  onFileSelect: (path: string, content: string) => void;
  selectedPath?: string;
  scrollToSelection?: boolean;
  revealSelection?: number;
  height?: number | string;
  changedFiles?: Map<string, DiffStats>;
  disabled?: boolean;
  selectedFolderPath?: string;
  onFolderSelect?: (path: string) => void;
  collapsedPaths?: ReadonlySet<string>;
  onFolderToggle?: (path: string) => void;
  renderActions?: (node: FileNode) => ReactNode;
}
type TreeNodeProps = Omit<FileExplorerTreeProps, "data" | "height"> & {
  node: FileNode;
  depth: number;
  ancestorsOpen?: boolean;
};
function TreeNode({
  node,
  depth,
  selectedPath,
  scrollToSelection = true,
  revealSelection,
  ancestorsOpen = true,
  onFileSelect,
  changedFiles,
  disabled = false,
  selectedFolderPath,
  onFolderSelect,
  collapsedPaths,
  onFolderToggle,
  renderActions,
}: TreeNodeProps) {
  const [open, setOpen] = useState(true);
  const rowRef = useRef<HTMLDivElement>(null);
  const lastRevealed = useRef<number | undefined>(undefined);
  const isFolder = Array.isArray(node.children);
  const isOpen = collapsedPaths ? !collapsedPaths.has(node.path) : open;
  const isSelected = !isFolder && selectedPath === node.path;
  const diffStats = !isFolder ? changedFiles?.get(node.path) : undefined;
  useEffect(() => {
    if (
      !isSelected ||
      isFolder ||
      !ancestorsOpen ||
      (!scrollToSelection &&
        (revealSelection === undefined ||
          revealSelection === lastRevealed.current))
    )
      return;
    const frame = requestAnimationFrame(() => {
      if (rowRef.current && revealExplorerRow(rowRef.current))
        lastRevealed.current = revealSelection;
    });
    return () => cancelAnimationFrame(frame);
  }, [isSelected, isFolder, scrollToSelection, revealSelection, ancestorsOpen]);
  useEffect(() => {
    if (
      !collapsedPaths &&
      isFolder &&
      selectedPath?.startsWith(node.path + "/")
    )
      setOpen(true);
  }, [selectedPath, node.path, isFolder, collapsedPaths]);
  const select = () => {
    if (disabled) return;
    if (isFolder) {
      onFolderSelect?.(node.path);
      if (onFolderToggle) onFolderToggle(node.path);
      else setOpen(!isOpen);
    } else if (node.content !== undefined)
      onFileSelect(node.path, node.content);
  };
  return (
    <Box minW={0}>
      <HStack
        role="group"
        ref={rowRef}
        spacing={0}
        minW={0}
        bg={isSelected ? "whiteAlpha.200" : "transparent"}
        _hover={{ bg: isSelected ? "whiteAlpha.200" : "whiteAlpha.100" }}
        borderRadius="sm"
        userSelect="none"
      >
        <HStack
          as="button"
          type="button"
          disabled={disabled}
          aria-label={node.path}
          aria-expanded={isFolder ? isOpen : undefined}
          aria-current={!isFolder && isSelected ? "true" : undefined}
          onClick={select}
          _focusVisible={{
            outline: "2px solid",
            outlineColor: "primary.400",
            outlineOffset: "-2px",
          }}
          spacing={1}
          py={0.5}
          px={2}
          pl={`${depth * 16 + 8}px`}
          minH={renderActions ? "30px" : "24px"}
          minW={0}
          flex={1}
          textAlign="left"
          cursor={disabled ? "not-allowed" : "pointer"}
          opacity={disabled ? 0.5 : 1}
          title={node.path}
        >
          {isFolder ? (
            <Icon
              as={isOpen ? ChevronDownIcon : ChevronRightIcon}
              boxSize={3}
              flexShrink={0}
              color="text.tertiary"
            />
          ) : (
            <Box as="span" w={3} flexShrink={0} />
          )}
          {isFolder ? (
            <Icon
              as={isOpen ? FaFolderOpen : FaFolder}
              boxSize={3.5}
              flexShrink={0}
              color="orange.300"
              opacity={0.8}
            />
          ) : node.name.endsWith(".sol") ? (
            <Icon
              as={SiSolidity}
              boxSize={3.5}
              flexShrink={0}
              color="blue.400"
            />
          ) : (
            <Icon
              as={FileText}
              boxSize={3.5}
              flexShrink={0}
              color="text.tertiary"
            />
          )}
          {diffStats && (
            <HStack as="span" spacing={0.5} flexShrink={0}>
              <Text
                as="span"
                fontSize="9px"
                color="green.400"
                fontWeight="semibold"
                lineHeight="1"
              >
                +{diffStats.linesAdded}
              </Text>
              <Text
                as="span"
                fontSize="9px"
                color="red.400"
                fontWeight="semibold"
                lineHeight="1"
              >
                -{diffStats.linesRemoved}
              </Text>
            </HStack>
          )}
          <Text
            as="span"
            fontSize="xs"
            color={isSelected ? "text.primary" : "text.secondary"}
            fontWeight={node.isTarget ? "semibold" : "normal"}
            isTruncated
            minW={0}
            flex={1}
          >
            {node.name}
          </Text>
          {node.isTarget && (
            <Icon
              as={Star}
              boxSize={3}
              flexShrink={0}
              color="yellow.400"
              fill="yellow.400"
            />
          )}
        </HStack>
        {renderActions && (
          <Box flexShrink={0} pr={1}>
            {renderActions(node)}
          </Box>
        )}
      </HStack>
      {isFolder && node.children && (
        <Box display={isOpen ? "block" : "none"}>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              scrollToSelection={scrollToSelection}
              revealSelection={revealSelection}
              ancestorsOpen={ancestorsOpen && isOpen}
              onFileSelect={onFileSelect}
              changedFiles={changedFiles}
              disabled={disabled}
              selectedFolderPath={selectedFolderPath}
              onFolderSelect={onFolderSelect}
              collapsedPaths={collapsedPaths}
              onFolderToggle={onFolderToggle}
              renderActions={renderActions}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
export function FileExplorerTree({
  data,
  height = 350,
  ...props
}: FileExplorerTreeProps) {
  const h = typeof height === "string" ? height : `${height}px`;
  if (!data?.length)
    return (
      <Box h={h} p={4}>
        <Text color="text.tertiary" fontSize="sm">
          No files
        </Text>
      </Box>
    );
  return (
    <Box
      h={h}
      data-source-files-scroll={h === "auto" ? undefined : ""}
      minW={0}
      overflowY={h === "auto" ? "visible" : "auto"}
      overflowX={h === "auto" ? "visible" : "hidden"}
      css={{
        "&::-webkit-scrollbar": { width: "6px" },
        "&::-webkit-scrollbar-thumb": {
          background: "rgba(255,255,255,0.2)",
          borderRadius: "3px",
        },
      }}
    >
      <VStack spacing={0} align="stretch" minW={0}>
        {data.map((node) => (
          <TreeNode key={node.id} node={node} depth={0} {...props} />
        ))}
      </VStack>
    </Box>
  );
}
