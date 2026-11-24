import {
  Button,
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Portal,
} from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";

export type ReadAction = "Read" | "Encode Calldata" | "Query at Block" | "Query at Time";

export function ReadButton({
  action,
  onActionChange,
  onRead,
  onEncode,
  onHistoricalQuery,
  isDisabled,
  isLoading,
  isError,
}: {
  action: ReadAction;
  onActionChange: (action: ReadAction) => void;
  onRead: () => void;
  onEncode: () => void;
  onHistoricalQuery: () => void;
  isDisabled: boolean;
  isLoading: boolean;
  isError: boolean;
}) {
  return (
    <HStack
      spacing={0}
      bg="bg.muted"
      border="1px solid"
      borderColor={isError ? "red.400" : "border.strong"}
      rounded="lg"
      flexShrink={0}
    >
      <Button
        size="sm"
        variant="ghost"
        borderLeftRadius="lg"
        borderRightRadius={0}
        px={3}
        h={{ base: 10, md: 8 }}
        minW="3.5rem"
        color={isError ? "red.300" : "text.primary"}
        _hover={{ bg: "whiteAlpha.100" }}
        isDisabled={isDisabled}
        isLoading={action !== "Encode Calldata" && isLoading}
        onClick={action === "Read" ? onRead : action === "Encode Calldata" ? onEncode : onHistoricalQuery}
        title={action === "Read" ? "Read function" : action}
      >
        {action}
      </Button>
      <Menu isLazy placement="bottom-end">
        <MenuButton
          as={IconButton}
          aria-label="Read options"
          icon={<ChevronDownIcon />}
          size="xs"
          variant="ghost"
          h={{ base: 10, md: 8 }}
          minW={{ base: 9, md: 6 }}
          borderLeft="1px solid"
          borderLeftColor="border.strong"
          borderLeftRadius={0}
          borderRightRadius="lg"
          color="text.secondary"
          isDisabled={isLoading}
          _hover={{ bg: "whiteAlpha.100" }}
        />
        <Portal>
          <MenuList
            bg="bg.subtle"
            borderColor="border.default"
            rounded="lg"
            boxShadow="lg"
            py={1}
            minW="11rem"
          >
            {(["Read", "Encode Calldata", "Query at Block", "Query at Time"] as const).map((option) => (
              <MenuItem
                key={option}
                bg="transparent"
                color="text.primary"
                _hover={{ bg: "bg.emphasis" }}
                onClick={() => onActionChange(option)}
              >
                {option}
              </MenuItem>
            ))}
          </MenuList>
        </Portal>
      </Menu>
    </HStack>
  );
}
