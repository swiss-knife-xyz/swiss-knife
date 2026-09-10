# ETH.sh Design System & Styling Guide

This document outlines the design system, tokens, and styling conventions used throughout the ETH.sh application.

## Design Philosophy

Our design follows a **professional, enterprise-grade approach** inspired by Tenderly, Linear, Vercel, and Stripe:

1. **Clarity Over Cleverness** - Every element serves a functional purpose
2. **Trustworthy by Design** - Visual stability that inspires confidence for blockchain operations
3. **Developer-First** - Optimized for keyboard workflows, monospace for code/data
4. **Progressive Disclosure** - Essential controls visible, advanced options accessible
5. **Respectful of Attention** - Minimal visual noise, purposeful color and animation

---

## Dual Theme Approach

ETH.sh uses two distinct visual styles:

### Homepage (Red Theme)
- Matches the ETH.sh logo branding
- Uses `custom.base` (#e84142) as the primary accent
- Glass-morphism effects and gradient text
- Emojis for tool icons

### Tool Pages (Professional Blue Theme)
- Professional, enterprise-grade appearance
- Uses `primary.500` (#3B82F6) as the primary accent
- Clean, minimal styling with subtle borders
- Lucide icons for UI elements

---

## Typography

### Font Stack

```typescript
// Primary font (headings and body)
fontFamily: "var(--font-inter), Inter, -apple-system, BlinkMacSystemFont, sans-serif"

// Monospace font (code, addresses, hashes)
fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', 'Fira Code', Consolas, monospace"
```

### Type Scale

| Role | Size | Line Height | Weight | Letter Spacing |
|------|------|-------------|--------|----------------|
| Display | 48px | 56px | 700 | -0.02em |
| Heading 1 | 32px | 40px | 600 | -0.02em |
| Heading 2 | 24px | 32px | 600 | -0.01em |
| Heading 3 | 20px | 28px | 600 | -0.01em |
| Heading 4 | 16px | 24px | 600 | 0em |
| Body Large | 16px | 24px | 400 | 0em |
| Body | 14px | 20px | 400 | 0em |
| Body Small | 12px | 16px | 400 | 0em |
| Caption | 11px | 14px | 500 | 0.02em |
| Code | 13px | 20px | 400 | 0em |

### Usage in Chakra

```typescript
// Use textStyles for consistent typography
<Text textStyle="h1">Heading</Text>
<Text textStyle="body">Body text</Text>
<Text textStyle="code" fontFamily="mono">0x1234...</Text>
```

---

## Color System

### Design Tokens (from `/style/tokens.ts`)

#### Background Colors

| Token | Value | Usage |
|-------|-------|-------|
| `bg.base` | `#0A0A0B` | Main page background |
| `bg.subtle` | `#111113` | Card backgrounds, elevated surfaces |
| `bg.muted` | `#18181B` | Secondary backgrounds |
| `bg.emphasis` | `#27272A` | Hover states, active states |

#### Text Colors

| Token | Value | Usage |
|-------|-------|-------|
| `text.primary` | `#FAFAFA` | Primary text, headings |
| `text.secondary` | `#A1A1AA` | Secondary text, labels |
| `text.tertiary` | `#71717A` | Placeholder, disabled text |

#### Border Colors

| Token | Value | Usage |
|-------|-------|-------|
| `border.subtle` | `rgba(255,255,255,0.06)` | Subtle divisions |
| `border.default` | `rgba(255,255,255,0.10)` | Standard borders |
| `border.strong` | `rgba(255,255,255,0.16)` | Emphasized borders |

#### Primary Brand (Tool Pages)

```typescript
primary: {
  400: "#60A5FA",  // Light blue - links, highlights
  500: "#3B82F6",  // Main brand color
  600: "#2563EB",  // Hover states
  700: "#1D4ED8",  // Active states
}
```

#### Homepage Brand

```typescript
custom: {
  base: "#e84142",  // Original red - homepage branding
}
```

#### Status Colors

| Status | Background | Border | Text |
|--------|------------|--------|------|
| Success | `rgba(34,197,94,0.10)` | `rgba(34,197,94,0.30)` | `#4ADE80` |
| Warning | `rgba(251,191,36,0.10)` | `rgba(251,191,36,0.30)` | `#FBBF24` |
| Error | `rgba(239,68,68,0.10)` | `rgba(239,68,68,0.30)` | `#F87171` |
| Info | `rgba(59,130,246,0.10)` | `rgba(59,130,246,0.30)` | `#60A5FA` |

### Usage Examples

```typescript
// Tool page components
<Box bg="bg.subtle" borderColor="border.default">
  <Text color="text.primary">Primary text</Text>
  <Text color="text.secondary">Secondary text</Text>
  <Button variant="primary">Action</Button>
</Box>

// Homepage components (use original colors)
<Button bg="custom.base" _hover={{ bg: "red.600" }}>
  Explore Tools
</Button>
```

---

## Nested Components & Color Compatibility

### The `whiteAlpha` System

For components that can be nested inside other containers (like decoded params, expandable sections, etc.), use `whiteAlpha` colors instead of the opaque `bg.*` tokens. This ensures visual compatibility regardless of the parent background.

### When to Use `whiteAlpha` vs `bg.*` Tokens

| Context | Use | Example |
|---------|-----|---------|
| Page-level backgrounds | `bg.base`, `bg.subtle` | Layout, Navbar, Footer |
| Top-level cards/sections | `bg.subtle`, `bg.muted` | Main content cards |
| **Nested/embedded components** | `whiteAlpha.*` | Tabs inside params, nested cards |
| **Interactive elements in containers** | `whiteAlpha.*` | Buttons, tabs in expandable sections |

### Correct Pattern for Nested Components

```typescript
// ❌ WRONG: Using opaque bg.* colors in nested components
// This creates jarring contrast when inside whiteAlpha containers
<Box bg="whiteAlpha.50" rounded="lg">
  <TabsSelector ... /> // If tabs use bg.base, they look wrong
</Box>

// ✅ CORRECT: Using whiteAlpha for nested components
<Box bg="whiteAlpha.50" rounded="lg">
  <HStack bg="whiteAlpha.100" rounded="lg">
    <Box bg={isSelected ? "whiteAlpha.200" : "transparent"}>
      Tab content
    </Box>
  </HStack>
</Box>
```

### `whiteAlpha` Scale Reference

| Token | Opacity | Usage |
|-------|---------|-------|
| `whiteAlpha.50` | 4% | Subtle container backgrounds |
| `whiteAlpha.100` | 6% | Secondary container backgrounds |
| `whiteAlpha.200` | 8% | Active/selected states in nested components |
| `whiteAlpha.300` | 16% | Hover states, borders |
| `whiteAlpha.400` | 24% | Emphasized elements |
| `whiteAlpha.700` | 64% | Secondary text in nested contexts |

### Key Rules

1. **Never use `bg.base` or `bg.subtle` inside `whiteAlpha` containers** - the opaque dark colors create visual disconnects
2. **Tabs, buttons, and interactive elements inside expandable sections** should use `whiteAlpha` variants
3. **Text colors in nested components**: Use `white` and `whiteAlpha.700` instead of `text.primary` and `text.secondary`
4. **Borders in nested contexts**: Use `whiteAlpha.300` instead of `border.default`

### Component Examples

```typescript
// Tabs inside a nested container (like decoded params)
<HStack bg="whiteAlpha.100" rounded="lg" p={1}>
  <Box
    bg={isSelected ? "whiteAlpha.200" : "transparent"}
    color={isSelected ? "white" : "whiteAlpha.700"}
    _hover={{ bg: "whiteAlpha.100", color: "white" }}
  >
    Tab Label
  </Box>
</HStack>

// Nested card/section
<Stack bg="whiteAlpha.50" rounded="lg" p={4}>
  <Text color="white">Primary content</Text>
  <Text color="whiteAlpha.700">Secondary content</Text>
  <Box borderColor="whiteAlpha.300" borderWidth="1px">
    Bordered content
  </Box>
</Stack>
```

---

## Component Patterns

### Buttons

```typescript
// Primary button (tool pages)
<Button variant="primary">
  Primary Action
</Button>

// Secondary button
<Button variant="secondary">
  Secondary Action
</Button>

// Ghost button
<Button variant="ghost">
  Subtle Action
</Button>

// Homepage red button
<Button bg="custom.base" color="white" _hover={{ bg: "red.600" }}>
  Explore Tools
</Button>
```

### Input Fields

Always use the `InputField` component for consistent styling and copy functionality:

```typescript
import { InputField } from "@/components/InputField";

<InputField
  placeholder="Enter value"
  value={value}
  onChange={handleChange}
  isInvalid={hasError}
/>
```

Input styling is handled automatically:
- Background: `bg.subtle`
- Border: `border.default`, hover: `border.strong`
- Focus: `primary.500` border with ring
- Error: `error.solid` border with ring

### Cards

```typescript
import { Card } from "@/components/Card";

// Elevated card (default)
<Card>Content</Card>

// Interactive card
<Card variant="interactive">Clickable content</Card>

// Outline card
<Card variant="outline">Outlined content</Card>
```

### Tabs

```typescript
import TabsSelector from "@/components/Tabs/TabsSelector";

<TabsSelector
  tabs={["Tab 1", "Tab 2", "Tab 3"]}
  selectedTabIndex={selectedIndex}
  setSelectedTabIndex={setSelectedIndex}
/>
```

### Select

```typescript
import { DarkSelect } from "@/components/DarkSelect";

<DarkSelect
  placeholder="Select option"
  options={options}
  selectedOption={selected}
  setSelectedOption={setSelected}
/>
```

---

## Layout System

### Container Widths

| Token | Width | Usage |
|-------|-------|-------|
| `container.sm` | 640px | Narrow content |
| `container.md` | 768px | Standard tools |
| `container.lg` | 1024px | Wide tools |
| `container.xl` | 1280px | Homepage, grids |

### Spacing Scale

```
4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px, 80px, 96px
```

### Page Layout Pattern

```typescript
// Tool pages use the Layout component
import { Layout } from "@/components/Layout";

<Layout>
  <Box maxW="container.lg" mx="auto">
    {/* Page content */}
  </Box>
</Layout>
```

### Standard Page Header

```typescript
<Box mb={8} textAlign="center">
  <Heading size="xl" color="text.primary" mb={4}>
    Page Title
  </Heading>
  <Text color="text.secondary" maxW="600px" mx="auto">
    Clear, concise description
  </Text>
</Box>
```

---

## Icons

### Library: Lucide React

```typescript
import { Code2, Search, ArrowLeftRight } from "lucide-react";
```

### Icon Sizes

| Token | Size | Usage |
|-------|------|-------|
| `sm` | 16px | Buttons, inputs |
| `md` | 20px | List items |
| `lg` | 24px | Section headers |
| `xl` | 32px | Page headers |

### Icon Colors

```typescript
// Tool pages - use primary blue
<Icon as={Code2} size={20} color="var(--chakra-colors-primary-400)" />

// Navbar/Footer - use text.secondary
<Github size={22} color="var(--chakra-colors-text-secondary)" />
```

---

## Animation & Motion

### Timing

| Duration | Usage |
|----------|-------|
| 100ms | Button states, toggles |
| 200ms | Standard transitions |
| 300ms | Panel transitions |
| 500ms | Page transitions |

### Standard Hover Effect

```typescript
_hover={{
  transform: "translateY(-2px)",
  boxShadow: "lg",
  borderColor: "primary.500",
}}
transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
```

---

## Simplicity Principles

### When to Keep It Simple

- **One input per line** for converter tools
- **Single color scheme** within individual tools
- **Minimal sectioning** - don't break simple workflows
- **Linear flow** - users should scan vertically

### When Complex Layouts Are Appropriate

- Multi-step configuration processes
- Tools with distinct input/output phases
- Dashboard-style interfaces with different data types

---

## Copy Functionality

### Always Include Copy Buttons

- All input fields should have copy functionality
- All output/readonly fields should have copy functionality
- Hash outputs and address results are prime candidates
- Use the `InputField` component for consistency

```typescript
// InputField includes copy button automatically
<InputField
  placeholder="Result"
  value={result}
  onChange={() => {}}
  isReadOnly
/>
```

---

## Accessibility

### Requirements (WCAG 2.1 AA)

- **Contrast:** 4.5:1 minimum for text
- **Focus:** Visible 2px primary-500 outline
- **Keyboard:** All elements focusable, logical tab order
- **Motion:** Respect `prefers-reduced-motion`
- **Forms:** Labels linked, errors announced

### Focus States

```typescript
_focusVisible={{
  outline: "none",
  boxShadow: "0 0 0 3px rgba(59,130,246,0.4)",
}}
```

---

## File Reference

| File | Purpose |
|------|---------|
| `/style/tokens.ts` | Design tokens (colors, typography, spacing) |
| `/style/theme.ts` | Chakra UI theme configuration |
| `/app/IndexLayout.tsx` | Font loading (Inter, JetBrains Mono) |
| `/components/InputField.tsx` | Standard input with copy functionality |
| `/components/DarkButton.tsx` | Button component |
| `/components/DarkSelect.tsx` | Select dropdown |
| `/components/Card.tsx` | Card component |
| `/components/Tabs/` | Tab components |
| `/components/Layout.tsx` | Main layout wrapper |
| `/components/Navbar.tsx` | Navigation bar |
| `/components/Footer.tsx` | Footer |

---

## Migration from Old Styles

If updating old components, use these mappings:

| Old | New |
|-----|-----|
| `bg="bg.900"` | `bg="bg.base"` |
| `bg="whiteAlpha.50"` | `bg="bg.subtle"` |
| `bg="whiteAlpha.100"` | `bg="bg.muted"` |
| `borderColor="whiteAlpha.200"` | `borderColor="border.default"` |
| `color="gray.100"` | `color="text.primary"` |
| `color="gray.300"` | `color="text.secondary"` |
| `color="gray.400"` / `gray.500"` | `color="text.tertiary"` |
| `color="blue.400"` | `color="primary.400"` |

---

_This guide should be referenced when creating new components or modifying existing ones to ensure visual consistency across the ETH.sh application._
