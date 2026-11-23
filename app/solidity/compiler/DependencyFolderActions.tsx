"use client";
import {
  Box,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
} from "@chakra-ui/react";
import { MoreHorizontal, Trash2 } from "lucide-react";
import type { DependencyLock } from "@/lib/solidity/dependencies";

export function DependencyFolderActions({
  path,
  packages,
  disabled,
  onDelete,
}: {
  path: string;
  packages: DependencyLock[];
  disabled: boolean;
  onDelete: (name: string) => void;
}) {
  return (
    <Menu size="compact" placement="bottom-end" strategy="fixed">
      {({ isOpen }) => (
        <>
          <Box position="relative" w={6} h={6}>
            <Text
              position="absolute"
              inset={0}
              display="flex"
              alignItems="center"
              justifyContent="center"
              pointerEvents="none"
              fontSize="9px"
              color="text.tertiary"
              title="Read-only dependency"
              visibility={isOpen ? "hidden" : "visible"}
              _groupHover={{ visibility: "hidden" }}
              _groupFocusWithin={{ visibility: "hidden" }}
              sx={{ "@media (hover: none)": { visibility: "hidden" } }}
            >
              LIB
            </Text>
            <MenuButton
              as={IconButton}
              aria-label={`Actions for dependency folder ${path}`}
              title="Dependency actions"
              icon={<MoreHorizontal size={14} />}
              variant="ghost"
              size="xs"
              w={6}
              h={6}
              isDisabled={disabled}
              opacity={isOpen ? 1 : 0}
              _groupHover={{ opacity: 1 }}
              _groupFocusWithin={{ opacity: 1 }}
              _focusVisible={{ opacity: 1 }}
              sx={{ "@media (hover: none)": { opacity: 1 } }}
            />
          </Box>
          <MenuList minW="160px">
            {packages.map((dep) => (
              <MenuItem
                key={dep.name}
                icon={<Trash2 size={14} />}
                onClick={() => onDelete(dep.name)}
              >
                {packages.length === 1
                  ? "Delete dependency"
                  : `Delete ${dep.name}`}
              </MenuItem>
            ))}
          </MenuList>
        </>
      )}
    </Menu>
  );
}
