import type { FormatSelectProps } from "@/components/DarkSelect";

export const compactFormatSelectProps: FormatSelectProps = {
  size: "sm",
  controlProps: {
    h: "32px",
    minH: "32px",
    borderRadius: "4px",
    fontSize: "12px",
  },
  boxProps: { w: "7rem", minW: "7rem", maxW: "7rem", flexShrink: 0 },
};

export const compactValueFieldProps = {
  h: "32px",
  borderRadius: "4px",
  fontSize: "12px",
  fontFamily: "mono",
} as const;

export const decodedValueFieldProps = {
  ...compactValueFieldProps,
  // Keep native text selection and keyboard access without an editing caret.
  style: { caretColor: "transparent" },
} as const;
