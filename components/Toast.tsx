"use client";

import type { ReactNode } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  CloseButton,
  type ChakraProviderProps,
  type ToastProps,
  type createRenderToast,
} from "@chakra-ui/react";

/** Presentation only: Chakra still owns timers, announcements, stacking and updates. */
export function Toast({
  id,
  title,
  description,
  status,
  icon,
  isClosable,
  onClose,
  variant = "app-toast",
  colorScheme,
  action,
}: ToastProps & { action?: ReactNode }) {
  const rootId = id != null ? `toast-${id}` : undefined;

  return (
    <Alert
      id={rootId}
      addRole={false}
      status={status}
      variant={variant}
      colorScheme={colorScheme}
      alignItems="flex-start"
      textAlign="start"
      data-app-toast=""
    >
      <AlertIcon aria-hidden="true">{icon}</AlertIcon>
      <Box flex="1" minW={0}>
        {title && (
          <AlertTitle id={rootId && `${rootId}-title`}>{title}</AlertTitle>
        )}
        {description && (
          <AlertDescription
            id={rootId && `${rootId}-description`}
            display="block"
          >
            {description}
          </AlertDescription>
        )}
      </Box>
      {action && <Box flexShrink={0}>{action}</Box>}
      {isClosable && (
        <CloseButton
          aria-label="Close notification"
          onClick={onClose}
          size="sm"
          flexShrink={0}
          minW={6}
          minH={6}
          color="inherit"
          opacity={0.7}
          _hover={{ opacity: 1, bg: "whiteAlpha.100" }}
          _focusVisible={{
            opacity: 1,
            outline: "2px solid",
            outlineColor: "primary.400",
            outlineOffset: "2px",
          }}
        />
      )}
    </Alert>
  );
}

// Chakra v2's createRenderToast supports toastComponent. Keeping it in defaults
// (rather than render) preserves each caller's custom render, including Undo UI.
const defaultOptions: NonNullable<Parameters<typeof createRenderToast>[0]> = {
  toastComponent: Toast,
};

export const toastOptions = {
  defaultOptions,
} satisfies NonNullable<ChakraProviderProps["toastOptions"]>;
