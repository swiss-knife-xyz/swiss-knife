import { defineStyle } from "@chakra-ui/react";

/** Only used by the shared Toast; inline Alert components keep their own styles. */
export const toastVariant = defineStyle(({ status = "info", colorScheme }) => {
  const states = {
    info: { color: "info.text", scheme: "blue" },
    loading: { color: "info.text", scheme: "blue" },
    success: { color: "success.text", scheme: "green" },
    warning: { color: "warning.text", scheme: "orange" },
    error: { color: "error.text", scheme: "red" },
  };
  const state = states[status as keyof typeof states] ?? states.info;
  const accent =
    colorScheme && colorScheme !== state.scheme
      ? `${colorScheme}.300`
      : state.color;

  return {
    container: {
      bg: "bg.muted",
      color: "text.primary",
      border: "1px solid",
      borderColor: "border.strong",
      borderRadius: "lg",
      boxShadow: "none",
      p: 4,
      gap: 3,
      fontFamily: "body",
      width: "100%",
      overflowWrap: "anywhere",
    },
    icon: { color: accent, boxSize: 5, mt: "2px", marginEnd: 0, flexShrink: 0 },
    spinner: {
      color: accent,
      boxSize: 5,
      mt: "2px",
      marginEnd: 0,
      flexShrink: 0,
    },
    title: {
      fontSize: "md",
      fontWeight: "semibold",
      lineHeight: "base",
      marginEnd: 0,
    },
    description: {
      fontSize: "md",
      lineHeight: "base",
      color: "text.secondary",
      a: {
        color: "primary.300",
        textDecoration: "underline",
        textUnderlineOffset: "3px",
        _hover: { color: "primary.200" },
        _focusVisible: {
          outline: "2px solid",
          outlineColor: "primary.400",
          outlineOffset: "2px",
        },
      },
    },
  };
});
