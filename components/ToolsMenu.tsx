"use client";

import { useEffect, useRef } from "react";
import { Button, Text, Tooltip, useDisclosure } from "@chakra-ui/react";
import { Menu } from "lucide-react";
import { ToolsDrawer } from "./ToolsDrawer";

/** Shared launcher and shortcut for the homepage and tool navigation bars. */
export function ToolsMenu() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const searchRef = useRef<HTMLInputElement>(null!);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey || event.isComposing) return;
      event.preventDefault();
      if (isOpen) searchRef.current?.focus();
      else onOpen();
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [isOpen, onOpen]);

  return (
    <>
      <Tooltip label="All Tools (⌘K / Ctrl+K)" placement="bottom">
        <Button
          aria-label="Open all tools"
          aria-keyshortcuts="Meta+K Control+K"
          aria-expanded={isOpen}
          rightIcon={<Menu size={20} />}
          iconSpacing={2}
          px={2}
          variant="ghost"
          color="text.secondary"
          _hover={{ color: "text.primary", bg: "bg.emphasis" }}
          onClick={onOpen}
          size="md"
        >
          <Text as="kbd" fontFamily="inherit" fontSize="xs" fontWeight="normal" color="text.tertiary" whiteSpace="nowrap" aria-hidden="true">
            ⌘ K
          </Text>
        </Button>
      </Tooltip>
      <ToolsDrawer isOpen={isOpen} onClose={onClose} searchRef={searchRef} />
    </>
  );
}
