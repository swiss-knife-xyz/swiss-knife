"use client";

import { Box, HStack, Text, IconButton, Tooltip } from "@chakra-ui/react";
import { CloseIcon } from "@chakra-ui/icons";
import { Pin } from "lucide-react";
import { TabData } from "./types";

interface CodeEditorTabsProps {
  tabs: TabData[];
  activeTabId: string;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
}

export function CodeEditorTabs({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
}: CodeEditorTabsProps) {
  if (tabs.length === 0) return null;

  return (
    <Box
      borderBottom="1px solid"
      borderColor="whiteAlpha.200"
      bg="bg.muted"
      overflowX="auto"
      css={{
        "&::-webkit-scrollbar": {
          height: "4px",
        },
        "&::-webkit-scrollbar-thumb": {
          background: "rgba(255,255,255,0.2)",
          borderRadius: "2px",
        },
      }}
    >
      <HStack spacing={0} minW="max-content">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <HStack
              key={tab.id}
              spacing={1}
              px={3}
              py={1.5}
              cursor="pointer"
              bg={isActive ? "whiteAlpha.100" : "transparent"}
              borderRight="1px solid"
              borderColor="whiteAlpha.100"
              _hover={{ bg: isActive ? "whiteAlpha.100" : "whiteAlpha.50" }}
              onClick={() => onTabSelect(tab.id)}
              maxW="220px"
              minW="80px"
            >
              {/* Pinned indicator */}
              {tab.isPinned && (
                <Tooltip label="Pinned (main contract)" placement="top">
                  <Box color="text.tertiary">
                    <Pin size={12} />
                  </Box>
                </Tooltip>
              )}

              {/* File name */}
              <Tooltip label={tab.path} placement="top" openDelay={500}>
                <HStack spacing={1.5} flex={1} minW={0}>
                  <Text
                    fontSize="xs"
                    color={isActive ? "text.primary" : "text.secondary"}
                    fontWeight={isActive ? "medium" : "normal"}
                    isTruncated
                  >
                    {tab.name}
                  </Text>
                  {tab.diffStats && (
                    <HStack spacing={0.5} flexShrink={0}>
                      <Text fontSize="10px" color="green.400" fontWeight="medium">
                        +{tab.diffStats.linesAdded}
                      </Text>
                      <Text fontSize="10px" color="red.400" fontWeight="medium">
                        -{tab.diffStats.linesRemoved}
                      </Text>
                    </HStack>
                  )}
                </HStack>
              </Tooltip>

              {/* Close button (not for pinned tabs) */}
              {!tab.isPinned && (
                <IconButton
                  aria-label="Close tab"
                  icon={<CloseIcon boxSize={2} />}
                  size="xs"
                  variant="ghost"
                  minW={4}
                  h={4}
                  color="text.tertiary"
                  _hover={{ color: "text.primary", bg: "whiteAlpha.200" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabClose(tab.id);
                  }}
                />
              )}
            </HStack>
          );
        })}
      </HStack>
    </Box>
  );
}
