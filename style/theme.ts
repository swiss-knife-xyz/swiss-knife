import { extendTheme, ThemeConfig } from "@chakra-ui/react";
import {
  colors as tokenColors,
  typography,
  spacing,
  layout,
  shadows,
  animation,
} from "./tokens";

// ============================================================================
// COLOR CONFIGURATION
// ============================================================================

export const colors = {
  // New semantic colors
  bg: {
    base: tokenColors.bg.base,
    subtle: tokenColors.bg.subtle,
    muted: tokenColors.bg.muted,
    emphasis: tokenColors.bg.emphasis,
    // Legacy mappings
    900: tokenColors.bg.base,
    800: tokenColors.bg.subtle,
    700: tokenColors.bg.muted,
    100: "white",
  },

  text: tokenColors.text,
  border: tokenColors.border,

  // Primary brand color
  primary: tokenColors.primary,

  // Status colors
  success: tokenColors.success,
  warning: tokenColors.warning,
  error: tokenColors.error,
  info: tokenColors.info,

  // Legacy custom colors (updated for new design)
  custom: tokenColors.custom,
};

// ============================================================================
// FONT CONFIGURATION
// ============================================================================

const fonts = {
  heading: typography.fonts.heading,
  body: typography.fonts.body,
  mono: typography.fonts.mono,
};

const fontSizes = {
  xs: typography.fontSizes.caption,
  sm: typography.fontSizes.bodySm,
  md: typography.fontSizes.body,
  lg: typography.fontSizes.bodyLg,
  xl: typography.fontSizes.h4,
  "2xl": typography.fontSizes.h3,
  "3xl": typography.fontSizes.h2,
  "4xl": typography.fontSizes.h1,
  "5xl": typography.fontSizes.display,
  code: typography.fontSizes.code,
};

const lineHeights = {
  normal: "normal",
  none: "1",
  shorter: "1.25",
  short: "1.375",
  base: "1.5",
  tall: "1.625",
  taller: "2",
};

const fontWeights = {
  normal: typography.fontWeights.normal,
  medium: typography.fontWeights.medium,
  semibold: typography.fontWeights.semibold,
  bold: typography.fontWeights.bold,
};

const letterSpacings = {
  tighter: typography.letterSpacing.display,
  tight: typography.letterSpacing.heading,
  normal: typography.letterSpacing.body,
  wide: typography.letterSpacing.caption,
};

// ============================================================================
// SPACING CONFIGURATION
// ============================================================================

const space = {
  px: "1px",
  0: spacing["0"],
  0.5: "2px",
  1: spacing["1"],
  1.5: "6px",
  2: spacing["2"],
  2.5: "10px",
  3: spacing["3"],
  3.5: "14px",
  4: spacing["4"],
  5: spacing["5"],
  6: spacing["6"],
  7: "28px",
  8: spacing["8"],
  9: "36px",
  10: spacing["10"],
  12: spacing["12"],
  14: "56px",
  16: spacing["16"],
  20: spacing["20"],
  24: spacing["24"],
  28: "112px",
  32: "128px",
  36: "144px",
  40: "160px",
  44: "176px",
  48: "192px",
  52: "208px",
  56: "224px",
  60: "240px",
  64: "256px",
  72: "288px",
  80: "320px",
  96: "384px",
};

// ============================================================================
// BORDER RADIUS CONFIGURATION
// ============================================================================

const radii = {
  none: layout.borderRadius.none,
  sm: layout.borderRadius.sm,
  base: layout.borderRadius.DEFAULT,
  md: layout.borderRadius.md,
  lg: layout.borderRadius.lg,
  xl: layout.borderRadius.xl,
  "2xl": "20px",
  "3xl": "24px",
  full: layout.borderRadius.full,
};

// ============================================================================
// SHADOW CONFIGURATION
// ============================================================================

const shadowsConfig = {
  xs: "0 0 0 1px rgba(0, 0, 0, 0.05)",
  sm: shadows.sm,
  base: shadows.DEFAULT,
  md: shadows.md,
  lg: shadows.lg,
  xl: shadows.xl,
  "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  outline: `0 0 0 3px ${tokenColors.primary[500]}40`,
  inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)",
  none: "none",
  dark: "0 0 0 1px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.1)",
  "dark-lg": shadows.xl,
  glow: shadows.glow.primary,
  "glow-success": shadows.glow.success,
  "glow-error": shadows.glow.error,
};

// ============================================================================
// BREAKPOINT CONFIGURATION
// ============================================================================

const breakpoints = {
  base: "0em",
  sm: "40em", // 640px
  md: "48em", // 768px
  lg: "64em", // 1024px
  xl: "80em", // 1280px
  "2xl": "96em", // 1536px
};

// ============================================================================
// TRANSITION CONFIGURATION
// ============================================================================

const transition = {
  property: {
    common: "background-color, border-color, color, fill, stroke, opacity, box-shadow, transform",
    colors: "background-color, border-color, color, fill, stroke",
    dimensions: "width, height",
    position: "left, right, top, bottom",
    background: "background-color, background-image, background-position",
  },
  easing: {
    "ease-in": animation.easing.in,
    "ease-out": animation.easing.out,
    "ease-in-out": animation.easing.inOut,
  },
  duration: {
    "ultra-fast": "50ms",
    faster: animation.duration.instant,
    fast: animation.duration.fast,
    normal: animation.duration.normal,
    slow: animation.duration.slow,
    "ultra-slow": "1000ms",
  },
};

// ============================================================================
// COMPONENT STYLES
// ============================================================================

const components = {
  // Button Component
  Button: {
    baseStyle: {
      fontWeight: "medium",
      borderRadius: "lg",
      transition: `all ${animation.duration.fast} ${animation.easing.default}`,
      _focusVisible: {
        boxShadow: `0 0 0 3px ${tokenColors.primary[500]}40`,
        outline: "none",
      },
    },
    sizes: {
      sm: {
        h: "32px",
        minW: "32px",
        fontSize: "sm",
        px: 3,
      },
      md: {
        h: "40px",
        minW: "40px",
        fontSize: "md",
        px: 4,
      },
      lg: {
        h: "48px",
        minW: "48px",
        fontSize: "lg",
        px: 6,
      },
    },
    variants: {
      // Primary button
      primary: {
        bg: "primary.500",
        color: "white",
        _hover: {
          bg: "primary.600",
          transform: "translateY(-1px)",
          _disabled: {
            bg: "primary.500",
            transform: "none",
          },
        },
        _active: {
          bg: "primary.700",
          transform: "translateY(0)",
        },
      },
      // Secondary button
      secondary: {
        bg: "transparent",
        color: "text.primary",
        border: "1px solid",
        borderColor: "border.default",
        _hover: {
          bg: "bg.emphasis",
          borderColor: "border.strong",
          transform: "translateY(-1px)",
        },
        _active: {
          bg: "bg.muted",
          transform: "translateY(0)",
        },
      },
      // Ghost button
      ghost: {
        bg: "transparent",
        color: "text.secondary",
        _hover: {
          bg: "bg.emphasis",
          color: "text.primary",
        },
        _active: {
          bg: "bg.muted",
        },
      },
      // Dark button (legacy support)
      dark: {
        bg: "bg.subtle",
        color: "text.primary",
        border: "1px solid",
        borderColor: "border.default",
        _hover: {
          bg: "bg.emphasis",
          borderColor: "border.strong",
        },
      },
    },
    defaultProps: {
      variant: "secondary",
      size: "md",
    },
  },

  // Input Component
  Input: {
    baseStyle: {
      field: {
        transition: `all ${animation.duration.fast} ${animation.easing.default}`,
      },
    },
    sizes: {
      sm: {
        field: {
          borderRadius: "md",
          fontSize: "sm",
          h: "32px",
          px: 3,
        },
      },
      md: {
        field: {
          borderRadius: "lg",
          fontSize: "md",
          h: "40px",
          px: 3,
        },
      },
      lg: {
        field: {
          borderRadius: "lg",
          fontSize: "lg",
          h: "48px",
          px: 4,
        },
      },
    },
    variants: {
      filled: {
        field: {
          bg: "bg.subtle",
          border: "1px solid",
          borderColor: "border.default",
          color: "text.primary",
          _placeholder: {
            color: "text.tertiary",
          },
          _hover: {
            borderColor: "border.strong",
          },
          _focus: {
            bg: "bg.subtle",
            borderColor: "primary.500",
            boxShadow: `0 0 0 3px ${tokenColors.primary[500]}20`,
          },
          _invalid: {
            borderColor: "error.solid",
            boxShadow: `0 0 0 3px ${tokenColors.error.solid}20`,
          },
        },
      },
      outline: {
        field: {
          bg: "bg.subtle",
          border: "1px solid",
          borderColor: "border.default",
          color: "text.primary",
          _placeholder: {
            color: "text.tertiary",
          },
          _hover: {
            borderColor: "border.strong",
          },
          _focus: {
            borderColor: "primary.500",
            boxShadow: `0 0 0 3px ${tokenColors.primary[500]}20`,
          },
          _invalid: {
            borderColor: "error.solid",
            boxShadow: `0 0 0 3px ${tokenColors.error.solid}20`,
          },
        },
      },
    },
    defaultProps: {
      variant: "filled",
      size: "md",
    },
  },

  // Textarea Component
  Textarea: {
    baseStyle: {
      transition: `all ${animation.duration.fast} ${animation.easing.default}`,
    },
    variants: {
      filled: {
        bg: "bg.subtle",
        border: "1px solid",
        borderColor: "border.default",
        color: "text.primary",
        borderRadius: "lg",
        _placeholder: {
          color: "text.tertiary",
        },
        _hover: {
          borderColor: "border.strong",
        },
        _focus: {
          bg: "bg.subtle",
          borderColor: "primary.500",
          boxShadow: `0 0 0 3px ${tokenColors.primary[500]}20`,
        },
      },
    },
    defaultProps: {
      variant: "filled",
    },
  },

  // Select Component
  Select: {
    variants: {
      filled: {
        field: {
          bg: "bg.subtle",
          border: "1px solid",
          borderColor: "border.default",
          color: "text.primary",
          borderRadius: "lg",
          _hover: {
            borderColor: "border.strong",
          },
          _focus: {
            borderColor: "primary.500",
            boxShadow: `0 0 0 3px ${tokenColors.primary[500]}20`,
          },
        },
      },
    },
    defaultProps: {
      variant: "filled",
    },
  },

  // Card-like Box styles via layerStyles
  Card: {
    baseStyle: {
      bg: "bg.subtle",
      border: "1px solid",
      borderColor: "border.subtle",
      borderRadius: "xl",
      p: 6,
      transition: `all ${animation.duration.normal} ${animation.easing.default}`,
    },
    variants: {
      elevated: {
        boxShadow: "md",
        _hover: {
          borderColor: "border.default",
          transform: "translateY(-2px)",
          boxShadow: "lg",
        },
      },
      outline: {
        bg: "transparent",
        borderColor: "border.default",
      },
      filled: {
        bg: "bg.muted",
        borderColor: "transparent",
      },
    },
    defaultProps: {
      variant: "elevated",
    },
  },

  // Heading Component
  Heading: {
    baseStyle: {
      color: "text.primary",
      fontWeight: "semibold",
    },
    sizes: {
      "4xl": {
        fontSize: "5xl",
        lineHeight: "56px",
        letterSpacing: "-0.02em",
      },
      "3xl": {
        fontSize: "4xl",
        lineHeight: "40px",
        letterSpacing: "-0.02em",
      },
      "2xl": {
        fontSize: "3xl",
        lineHeight: "32px",
        letterSpacing: "-0.01em",
      },
      xl: {
        fontSize: "2xl",
        lineHeight: "28px",
        letterSpacing: "-0.01em",
      },
      lg: {
        fontSize: "xl",
        lineHeight: "28px",
        letterSpacing: "-0.01em",
      },
      md: {
        fontSize: "lg",
        lineHeight: "24px",
      },
      sm: {
        fontSize: "md",
        lineHeight: "20px",
      },
    },
  },

  // Text Component
  Text: {
    baseStyle: {
      color: "text.primary",
    },
    variants: {
      secondary: {
        color: "text.secondary",
      },
      tertiary: {
        color: "text.tertiary",
      },
    },
  },

  // Link Component
  Link: {
    baseStyle: {
      color: "primary.400",
      transition: `color ${animation.duration.fast} ${animation.easing.default}`,
      _hover: {
        color: "primary.300",
        textDecoration: "none",
      },
    },
  },

  // Modal Component
  Modal: {
    baseStyle: {
      dialog: {
        bg: "bg.subtle",
        borderRadius: "xl",
        border: "1px solid",
        borderColor: "border.subtle",
      },
      header: {
        color: "text.primary",
        fontWeight: "semibold",
      },
      body: {
        color: "text.secondary",
      },
      closeButton: {
        color: "text.tertiary",
        _hover: {
          color: "text.primary",
          bg: "bg.emphasis",
        },
      },
    },
  },

  // Drawer Component
  Drawer: {
    baseStyle: {
      dialog: {
        bg: "bg.base",
      },
      header: {
        color: "text.primary",
        fontWeight: "semibold",
        borderBottomColor: "border.subtle",
      },
      body: {
        color: "text.secondary",
      },
      closeButton: {
        color: "text.tertiary",
        _hover: {
          color: "text.primary",
          bg: "bg.emphasis",
        },
      },
    },
  },

  // Menu Component
  Menu: {
    baseStyle: {
      list: {
        bg: "bg.subtle",
        border: "1px solid",
        borderColor: "border.default",
        borderRadius: "lg",
        boxShadow: "lg",
        py: 2,
      },
      item: {
        bg: "transparent",
        color: "text.primary",
        _hover: {
          bg: "bg.emphasis",
        },
        _focus: {
          bg: "bg.emphasis",
        },
      },
    },
  },

  // Tooltip Component
  Tooltip: {
    baseStyle: {
      bg: "bg.emphasis",
      color: "text.primary",
      borderRadius: "md",
      px: 3,
      py: 2,
      fontSize: "sm",
      fontWeight: "medium",
      boxShadow: "lg",
    },
  },

  // Tabs Component
  Tabs: {
    variants: {
      soft: {
        tablist: {
          bg: "bg.subtle",
          borderRadius: "lg",
          p: 1,
        },
        tab: {
          borderRadius: "md",
          fontWeight: "medium",
          color: "text.secondary",
          _selected: {
            bg: "bg.base",
            color: "text.primary",
            boxShadow: "sm",
          },
          _hover: {
            color: "text.primary",
          },
        },
      },
      line: {
        tab: {
          color: "text.secondary",
          fontWeight: "medium",
          borderBottom: "2px solid",
          borderColor: "transparent",
          _selected: {
            color: "primary.400",
            borderColor: "primary.400",
          },
          _hover: {
            color: "text.primary",
          },
        },
      },
    },
  },

  // Badge Component
  Badge: {
    baseStyle: {
      borderRadius: "md",
      fontWeight: "medium",
      textTransform: "none",
    },
    variants: {
      subtle: {
        bg: "bg.emphasis",
        color: "text.secondary",
      },
      solid: {
        bg: "primary.500",
        color: "white",
      },
      outline: {
        border: "1px solid",
        borderColor: "border.default",
        color: "text.secondary",
      },
    },
  },

  // Divider Component
  Divider: {
    baseStyle: {
      borderColor: "border.subtle",
    },
  },

  // Table Component
  Table: {
    variants: {
      simple: {
        th: {
          color: "text.secondary",
          borderColor: "border.subtle",
          fontWeight: "medium",
          textTransform: "none",
          letterSpacing: "normal",
        },
        td: {
          borderColor: "border.subtle",
        },
      },
    },
  },

  // Accordion Component
  Accordion: {
    baseStyle: {
      container: {
        borderColor: "border.subtle",
      },
      button: {
        color: "text.primary",
        _hover: {
          bg: "bg.emphasis",
        },
      },
      panel: {
        color: "text.secondary",
      },
    },
  },
};

// ============================================================================
// GLOBAL STYLES
// ============================================================================

const styles = {
  global: {
    html: {
      scrollBehavior: "smooth",
    },
    body: {
      bg: "bg.base",
      color: "text.primary",
      fontFamily: fonts.body,
      lineHeight: "base",
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale",
    },
    "*::placeholder": {
      color: "text.tertiary",
    },
    "*, *::before, &::after": {
      borderColor: "border.subtle",
    },
    // Code styling
    "code, pre, kbd, samp": {
      fontFamily: fonts.mono,
    },
    code: {
      bg: "bg.muted",
      borderRadius: "md",
      px: 1.5,
      py: 0.5,
      fontSize: "code",
    },
    pre: {
      bg: "bg.muted",
      borderRadius: "lg",
      p: 4,
      overflow: "auto",
      fontSize: "code",
    },
    // Focus styles
    "*:focus-visible": {
      outline: "none",
      boxShadow: `0 0 0 3px ${tokenColors.primary[500]}40`,
    },
    // Scrollbar styling
    "::-webkit-scrollbar": {
      width: "8px",
      height: "8px",
    },
    "::-webkit-scrollbar-track": {
      bg: "bg.subtle",
    },
    "::-webkit-scrollbar-thumb": {
      bg: "border.strong",
      borderRadius: "full",
      "&:hover": {
        bg: "text.tertiary",
      },
    },
    // Selection styling
    "::selection": {
      bg: `${tokenColors.primary[500]}40`,
      color: "text.primary",
    },
  },
};

// ============================================================================
// LAYER STYLES (for Card-like components)
// ============================================================================

const layerStyles = {
  card: {
    bg: "bg.subtle",
    border: "1px solid",
    borderColor: "border.subtle",
    borderRadius: "xl",
  },
  "card-hover": {
    bg: "bg.subtle",
    border: "1px solid",
    borderColor: "border.subtle",
    borderRadius: "xl",
    transition: `all ${animation.duration.normal} ${animation.easing.default}`,
    _hover: {
      borderColor: "border.default",
      transform: "translateY(-2px)",
      boxShadow: "lg",
    },
  },
  "card-interactive": {
    bg: "bg.subtle",
    border: "1px solid",
    borderColor: "border.subtle",
    borderRadius: "xl",
    transition: `all ${animation.duration.normal} ${animation.easing.default}`,
    cursor: "pointer",
    _hover: {
      borderColor: "primary.500",
      transform: "translateY(-2px)",
      boxShadow: "lg",
    },
  },
  surface: {
    bg: "bg.subtle",
    border: "1px solid",
    borderColor: "border.default",
    borderRadius: "lg",
  },
  elevated: {
    bg: "bg.subtle",
    boxShadow: "lg",
    borderRadius: "xl",
  },
};

// ============================================================================
// TEXT STYLES
// ============================================================================

const textStyles = {
  display: {
    fontSize: typography.fontSizes.display,
    lineHeight: typography.lineHeights.display,
    fontWeight: typography.fontWeights.bold,
    letterSpacing: typography.letterSpacing.display,
  },
  h1: {
    fontSize: typography.fontSizes.h1,
    lineHeight: typography.lineHeights.h1,
    fontWeight: typography.fontWeights.semibold,
    letterSpacing: typography.letterSpacing.display,
  },
  h2: {
    fontSize: typography.fontSizes.h2,
    lineHeight: typography.lineHeights.h2,
    fontWeight: typography.fontWeights.semibold,
    letterSpacing: typography.letterSpacing.heading,
  },
  h3: {
    fontSize: typography.fontSizes.h3,
    lineHeight: typography.lineHeights.h3,
    fontWeight: typography.fontWeights.semibold,
    letterSpacing: typography.letterSpacing.heading,
  },
  h4: {
    fontSize: typography.fontSizes.h4,
    lineHeight: typography.lineHeights.h4,
    fontWeight: typography.fontWeights.semibold,
  },
  body: {
    fontSize: typography.fontSizes.body,
    lineHeight: typography.lineHeights.body,
    fontWeight: typography.fontWeights.normal,
  },
  "body-lg": {
    fontSize: typography.fontSizes.bodyLg,
    lineHeight: typography.lineHeights.bodyLg,
    fontWeight: typography.fontWeights.normal,
  },
  "body-sm": {
    fontSize: typography.fontSizes.bodySm,
    lineHeight: typography.lineHeights.bodySm,
    fontWeight: typography.fontWeights.normal,
  },
  caption: {
    fontSize: typography.fontSizes.caption,
    lineHeight: typography.lineHeights.caption,
    fontWeight: typography.fontWeights.medium,
    letterSpacing: typography.letterSpacing.caption,
  },
  code: {
    fontFamily: fonts.mono,
    fontSize: typography.fontSizes.code,
    lineHeight: typography.lineHeights.code,
  },
  mono: {
    fontFamily: fonts.mono,
  },
};

// ============================================================================
// THEME CONFIG
// ============================================================================

const config: ThemeConfig = {
  initialColorMode: "dark",
  useSystemColorMode: false,
};

// ============================================================================
// EXPORT THEME
// ============================================================================

const theme = extendTheme({
  styles,
  config,
  colors,
  fonts,
  fontSizes,
  fontWeights,
  lineHeights,
  letterSpacings,
  space,
  radii,
  shadows: shadowsConfig,
  breakpoints,
  transition,
  components,
  layerStyles,
  textStyles,
});

export default theme;
