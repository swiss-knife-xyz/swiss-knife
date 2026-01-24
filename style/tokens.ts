/**
 * ETH.sh Design System Tokens
 * A professional, enterprise-grade design system
 */

// ============================================================================
// COLORS
// ============================================================================

export const colors = {
  // Background Colors (Dark Theme)
  bg: {
    base: "#0A0A0B",
    subtle: "#111113",
    muted: "#18181B",
    emphasis: "#27272A",
  },

  // Text Colors
  text: {
    primary: "#FAFAFA",
    secondary: "#A1A1AA",
    tertiary: "#71717A",
  },

  // Border Colors
  border: {
    subtle: "rgba(255,255,255,0.06)",
    default: "rgba(255,255,255,0.10)",
    strong: "rgba(255,255,255,0.16)",
  },

  // Primary Brand (Professional Blue)
  primary: {
    50: "#EFF6FF",
    100: "#DBEAFE",
    200: "#BFDBFE",
    300: "#93C5FD",
    400: "#60A5FA",
    500: "#3B82F6", // Main brand color
    600: "#2563EB",
    700: "#1D4ED8",
    800: "#1E40AF",
    900: "#1E3A8A",
  },

  // Status Colors
  success: {
    bg: "rgba(34,197,94,0.10)",
    border: "rgba(34,197,94,0.30)",
    text: "#4ADE80",
    solid: "#22C55E",
  },
  warning: {
    bg: "rgba(251,191,36,0.10)",
    border: "rgba(251,191,36,0.30)",
    text: "#FBBF24",
    solid: "#F59E0B",
  },
  error: {
    bg: "rgba(239,68,68,0.10)",
    border: "rgba(239,68,68,0.30)",
    text: "#F87171",
    solid: "#EF4444",
  },
  info: {
    bg: "rgba(59,130,246,0.10)",
    border: "rgba(59,130,246,0.30)",
    text: "#60A5FA",
    solid: "#3B82F6",
  },

  // Legacy colors (for backward compatibility - used on homepage)
  custom: {
    base: "#e84142", // Original red - used for homepage branding
    greenLight: "#4ADE80",
    greenDark: "#22C55E",
    greenDarker: "#16A34A",
    yellow: "#FBBF24",
    pale: "#FAFAFA",
    black: "#0A0A0B",
  },
};

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const typography = {
  fonts: {
    heading: "var(--font-inter), Inter, -apple-system, BlinkMacSystemFont, sans-serif",
    body: "var(--font-inter), Inter, -apple-system, BlinkMacSystemFont, sans-serif",
    mono: "var(--font-jetbrains-mono), 'JetBrains Mono', 'Fira Code', Consolas, monospace",
  },

  fontSizes: {
    display: "48px",
    h1: "32px",
    h2: "24px",
    h3: "20px",
    h4: "16px",
    bodyLg: "16px",
    body: "14px",
    bodySm: "12px",
    caption: "11px",
    code: "13px",
  },

  lineHeights: {
    display: "56px",
    h1: "40px",
    h2: "32px",
    h3: "28px",
    h4: "24px",
    bodyLg: "24px",
    body: "20px",
    bodySm: "16px",
    caption: "14px",
    code: "20px",
  },

  fontWeights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  letterSpacing: {
    display: "-0.02em",
    heading: "-0.01em",
    body: "0em",
    caption: "0.02em",
  },
};

// ============================================================================
// SPACING
// ============================================================================

export const spacing = {
  0: "0px",
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
  20: "80px",
  24: "96px",
};

// ============================================================================
// LAYOUT
// ============================================================================

export const layout = {
  container: {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
    "2xl": "1536px",
  },

  breakpoints: {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
    "2xl": "1536px",
  },

  borderRadius: {
    none: "0",
    sm: "4px",
    md: "6px",
    DEFAULT: "8px",
    lg: "12px",
    xl: "16px",
    full: "9999px",
  },
};

// ============================================================================
// SHADOWS
// ============================================================================

export const shadows = {
  sm: "0 1px 2px rgba(0,0,0,0.3)",
  DEFAULT: "0 2px 4px rgba(0,0,0,0.3)",
  md: "0 4px 8px rgba(0,0,0,0.3)",
  lg: "0 8px 16px rgba(0,0,0,0.3)",
  xl: "0 12px 24px rgba(0,0,0,0.3)",
  glow: {
    primary: "0 0 20px rgba(59,130,246,0.3)",
    success: "0 0 20px rgba(34,197,94,0.3)",
    error: "0 0 20px rgba(239,68,68,0.3)",
  },
};

// ============================================================================
// ANIMATION
// ============================================================================

export const animation = {
  duration: {
    instant: "100ms",
    fast: "200ms",
    normal: "300ms",
    slow: "500ms",
  },

  easing: {
    default: "cubic-bezier(0.4, 0, 0.2, 1)",
    in: "cubic-bezier(0.4, 0, 1, 1)",
    out: "cubic-bezier(0, 0, 0.2, 1)",
    inOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  },
};

// ============================================================================
// ICONS
// ============================================================================

export const iconSizes = {
  sm: "16px",
  md: "20px",
  lg: "24px",
  xl: "32px",
};

// ============================================================================
// Z-INDEX
// ============================================================================

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modal: 1300,
  popover: 1400,
  tooltip: 1500,
};
