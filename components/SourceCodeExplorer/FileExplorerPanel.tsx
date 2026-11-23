"use client";
import { useEffect, useState, type ReactNode } from "react";
import { Box, Button, HStack, Text } from "@chakra-ui/react";
import {
  FileExplorerTree,
  type FileExplorerTreeProps,
} from "./FileExplorerTree";
import { ChevronDown, ChevronRight } from "lucide-react";
import { SourceOutline, type SourceOutlineInput } from "./SourceOutline";

export function FileExplorerPanel({
  actions,
  onRootSelect,
  title = "Explorer",
  titleIcon,
  titleActionLabel = "Select workspace root",
  body,
  background = "bg.muted",
  outline,
  ...tree
}: FileExplorerTreeProps & {
  actions?: ReactNode;
  onRootSelect?: () => void;
  title?: string;
  titleIcon?: ReactNode;
  titleActionLabel?: string;
  body?: ReactNode;
  background?: string;
  outline?: SourceOutlineInput;
}) {
  const [filesOpen, setFilesOpen] = useState(true);
  const [outlineOpen, setOutlineOpen] = useState(true);
  useEffect(() => {
    if (tree.revealSelection !== undefined) setFilesOpen(true);
  }, [tree.revealSelection]);
  const sectionHeader = (name: string, open: boolean, toggle: () => void) => (
    <Button
      variant="unstyled"
      display="flex"
      alignItems="center"
      justifyContent="flex-start"
      gap={1.5}
      w="full"
      h={7}
      px={2}
      borderRadius="none"
      fontSize="xs"
      fontWeight="semibold"
      textTransform="uppercase"
      color="text.secondary"
      flexShrink={0}
      aria-expanded={open}
      aria-label={`${open ? "Collapse" : "Expand"} ${name}`}
      onClick={toggle}
      _hover={{ bg: "whiteAlpha.50" }}
    >
      {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />} {name}
    </Button>
  );
  return (
    <Box
      h="100%"
      minW={0}
      display="flex"
      flexDirection="column"
      bg={background}
    >
      <HStack
        px={3}
        py={2}
        spacing={1}
        borderBottomWidth="1px"
        borderColor="whiteAlpha.100"
        flexShrink={0}
        justify="space-between"
      >
        {onRootSelect ? (
          <Button
            variant="unstyled"
            size="xs"
            h="auto"
            minW={0}
            onClick={onRootSelect}
            display="flex"
            alignItems="center"
            gap={1.5}
            title={titleActionLabel}
            aria-label={titleActionLabel}
          >
            {titleIcon}
            <Text
              as="span"
              fontSize="xs"
              fontWeight="semibold"
              color="text.tertiary"
              textTransform="uppercase"
              letterSpacing="0.05em"
            >
              {title}
            </Text>
          </Button>
        ) : (
          <Text
            fontSize="xs"
            fontWeight="semibold"
            color="text.tertiary"
            textTransform="uppercase"
            letterSpacing="0.05em"
          >
            {title}
          </Text>
        )}
        {actions && (
          <HStack spacing={0} flexShrink={0}>
            {actions}
          </HStack>
        )}
      </HStack>
      {outline &&
        !body &&
        sectionHeader("Files", filesOpen, () =>
          setFilesOpen((value) => !value)
        )}
      {(filesOpen || !outline || body) && (
        <Box
          data-source-files-scroll=""
          flex={1}
          minW={0}
          minH={0}
          overflowY="auto"
        >
          {body ?? <FileExplorerTree height="100%" {...tree} />}
        </Box>
      )}
      {outline && !body && (
        <Box
          flex={outlineOpen ? (filesOpen ? "0 1 45%" : "1 1 0%") : "0 0 auto"}
          minH={outlineOpen ? "100px" : undefined}
          minW={0}
          display="flex"
          flexDirection="column"
          borderTopWidth="1px"
          borderColor="border.default"
        >
          {sectionHeader("Outline", outlineOpen, () =>
            setOutlineOpen((value) => !value)
          )}
          {outlineOpen && (
            <Box flex={1} minH={0} minW={0}>
              <SourceOutline source={outline} />
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
