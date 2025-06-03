# Swiss Knife UI Styling Guide

This document outlines the design language and styling conventions used throughout the Swiss Knife application, particularly for the Uniswap tools section.

## 🎨 Design Philosophy

Our design follows a **modern, minimalist approach** with:

- Clean glass-morphism effects
- Subtle color palettes that don't compete with functionality
- Professional typography with excellent readability
- Consistent spacing and visual hierarchy
- Dark theme optimization
- **Accessible copy functionality** for all output values

## 🧘 Simplicity & User Experience Principles

### **When to Keep It Simple**

**Prioritize simplicity over visual complexity** - especially for utility tools like converters:

- **One input per line** for converter tools (ETH units, hex conversion, etc.)
- **Single color scheme** within individual tools to avoid cognitive overload
- **Minimal sectioning** - don't break simple workflows into complex sections
- **Linear flow** - users should be able to scan vertically without jumping between sections

### **Simple vs. Complex Layouts**

```typescript
// ✅ GOOD: Simple converter layout
<VStack spacing={4}>
  <InputRow label="Wei" value={wei} onChange={...} />
  <InputRow label="Gwei" value={gwei} onChange={...} />
  <InputRow label="Ether" value={eth} onChange={...} />
</VStack>

// ❌ AVOID: Over-sectioned converter
<Box section="Base Units">
  <Grid columns={2}>
    <Input wei /> <Input gwei />
  </Grid>
</Box>
<Box section="Custom Units">...</Box>
<Box section="Primary Units">...</Box>
```

### **Color Consistency Within Tools**

- **Single accent color per tool** - typically `blue.400`
- **Reserve multiple colors** for tools with distinct functional areas (like Uniswap tools with different token pairs)
- **Consistent theming** - all icons, focus states, and accents should match

### **When Complex Layouts Are Appropriate**

Use sectioned layouts for tools that have **genuinely different functional areas**:

- Multi-step configuration processes
- Tools with distinct input/output phases
- Complex tools with multiple distinct workflows
- Dashboard-style interfaces with different data types

## 🎯 Color Palette

### Primary Text Colors

```typescript
// Primary headings and important text
color = "gray.100";

// Secondary text and labels
color = "gray.300";

// Subtle text, descriptions, and placeholders
color = "gray.400";

// Very subtle text and disabled states
color = "gray.500";
```

### Accent Colors

```typescript
// Primary accent (matches logo heritage)
color = "blue.400"; // For primary icons and buttons

// Secondary accents for different tool sections
color = "orange.400"; // Target/goal-related features
color = "green.400"; // Success states and liquidity
color = "purple.400"; // Configuration and settings
color = "red.400"; // Errors and warnings
```

### Background Colors

```typescript
// Main page containers
bg = "rgba(0, 0, 0, 0.05)";
backdropFilter = "blur(5px)";

// Component sections
bg = "whiteAlpha.50"; // Standard component background
bg = "whiteAlpha.30"; // Slightly more prominent sections
bg = "whiteAlpha.100"; // Input hover states and active elements

// Borders
borderColor = "whiteAlpha.50"; // Subtle page borders
borderColor = "whiteAlpha.100"; // Component borders
borderColor = "whiteAlpha.200"; // More defined borders
```

## 📝 Typography

### Page Headings

```typescript
<Heading size="xl" color="gray.100" fontWeight="bold" letterSpacing="tight">
  Page Title
</Heading>
```

### Section Headings

```typescript
<Heading size="md" color="gray.300">
  Section Title
</Heading>
```

### Descriptive Text

```typescript
<Text color="gray.400" fontSize="lg" maxW="600px" mx="auto">
  Description text
</Text>
```

### Labels and Form Text

```typescript
<Text color="gray.400" fontSize="sm" fontWeight="medium">
  Field Label
</Text>
```

## 🏗️ Layout Patterns

### Simple Converter Pattern

```typescript
<Box w="full" maxW="800px" mx="auto">
  <VStack spacing={4} align="stretch">
    <HStack spacing={4} p={4} bg="whiteAlpha.50" borderRadius="lg">
      <Box minW="120px">
        <VStack spacing={1} align="start">
          <HStack spacing={2}>
            <Icon as={IconComponent} color="blue.400" boxSize={4} />
            <Text color="gray.300" fontWeight="medium">
              {label}
            </Text>
          </HStack>
          {badge && <Badge>{badge}</Badge>}
        </VStack>
      </Box>
      <Box flex={1}>
        <Input /* ... standard input styling ... */ />
      </Box>
      {rightElement && <Box>{rightElement}</Box>}
    </HStack>
    {/* Repeat for each conversion unit */}
  </VStack>
</Box>
```

### Page Container

```typescript
<Box
  p={6}
  bg="rgba(0, 0, 0, 0.05)"
  backdropFilter="blur(5px)"
  borderRadius="xl"
  border="1px solid"
  borderColor="whiteAlpha.50"
  maxW="1400px" // Prevents stretching on wide screens
  mx="auto"
>
  {/* Page content */}
</Box>
```

### Page Header Pattern

```typescript
<Box mb={8} textAlign="center">
  <HStack justify="center" spacing={3} mb={4}>
    <Icon as={IconComponent} color="blue.400" boxSize={8} />
    <Heading size="xl" color="gray.100" fontWeight="bold" letterSpacing="tight">
      Page Title
    </Heading>
  </HStack>
  <Text color="gray.400" fontSize="lg" maxW="600px" mx="auto">
    Clear, concise description of the tool's purpose
  </Text>
</Box>
```

### Component Section

```typescript
<Box
  p={4}
  bg="whiteAlpha.50"
  borderRadius="lg"
  border="1px solid"
  borderColor="whiteAlpha.200"
>
  <VStack spacing={6} align="stretch">
    {/* Section header */}
    <HStack spacing={2} align="center">
      <Icon as={SectionIcon} color="purple.400" boxSize={6} />
      <Heading size="md" color="gray.300">
        Section Title
      </Heading>
    </HStack>

    {/* Section content */}
  </VStack>
</Box>
```

## 🔤 Icon Usage

### Icon Sizing

```typescript
// Page header icons
boxSize={8}

// Section header icons
boxSize={6}

// Small UI icons
boxSize={4}

// Inline icons
boxSize={3}
```

### Icon Colors by Context

```typescript
// Tool identification
color = "blue.400"; // Charts, data tools
color = "orange.400"; // Target/goal tools
color = "green.400"; // Liquidity/money tools
color = "purple.400"; // Configuration tools

// UI states
color = "gray.400"; // Neutral/inactive
color = "gray.500"; // Disabled
color = "red.400"; // Errors
color = "green.400"; // Success
```

## 📏 Spacing System

### Standard Spacing

```typescript
// Page-level spacing
p={6}           // Page container padding
mb={8}          // Page header bottom margin
px={8}          // Page content horizontal padding

// Component-level spacing
p={4}           // Component container padding
spacing={6}     // Major element spacing
spacing={4}     // Standard element spacing
spacing={3}     // Compact element spacing
spacing={2}     // Tight element spacing

// Dividers
my={4}          // Standard divider margin
my={6}          // Larger section breaks
```

### Layout Constraints

```typescript
maxW = "1400px"; // Page container max width
maxW = "600px"; // Description text max width
maxW = "800px"; // Simple converter max width
maxW = "400px"; // Form input max width (centered)
```

## 🎭 Component Patterns

### Input Fields

```typescript
<Input
  bg="whiteAlpha.50"
  border="1px solid"
  borderColor="whiteAlpha.200"
  _hover={{ borderColor: "whiteAlpha.300" }}
  _focus={{
    borderColor: "blue.400",
    boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
  }}
  color="gray.100"
  _placeholder={{ color: "gray.500" }}
  // ... other props
/>
```

### Buttons

```typescript
// Primary actions
<Button
  colorScheme="blue"
  leftIcon={<Icon as={ActionIcon} boxSize={4} />}
>
  Action Text
</Button>

// Secondary actions
<Button
  colorScheme="gray"
  variant="ghost"
  size="sm"
>
  Secondary Action
</Button>
```

### Status Badges

```typescript
<Badge
  colorScheme="green" // or "orange", "red", "purple" based on state
  fontSize="xs"
  px={2}
  py={0.5}
  rounded="md"
>
  Status Text
</Badge>
```

### Cards/Information Display

```typescript
<Box
  p={4}
  bg="whiteAlpha.100"
  borderRadius="md"
  border="1px solid"
  borderColor="whiteAlpha.200"
>
  <VStack spacing={3}>{/* Card content */}</VStack>
</Box>
```

## 🎪 Interactive States

### Hover Effects

```typescript
// Subtle hover for clickable elements
_hover={{
  bg: "whiteAlpha.100",
  transform: "translateY(-1px)", // Optional lift effect
}}

// Input hover
_hover={{ borderColor: "whiteAlpha.300" }}
```

### Active States

```typescript
// Active navigation items
bg = "whiteAlpha.200";
color = "blue.200";
borderLeft = "3px solid";
borderLeftColor = "blue.400";
```

### Focus States

```typescript
_focus={{
  borderColor: "blue.400",
  boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
}}
```

## 🎯 Sidebar Styling

### Sidebar Container

```typescript
<Flex w="220px" flexDir="column" py="2rem" minH="100vh">
  {/* Seamless background - no borders or backgrounds */}
</Flex>
```

### Sidebar Items

```typescript
<Flex
  align="center"
  p="3"
  mx="2"
  borderRadius="lg"
  cursor="pointer"
  transition="all 0.2s ease"
  borderLeft="3px solid"
  borderLeftColor={isActive ? "blue.400" : "transparent"}
  _hover={{ transform: "translateX(2px)" }}
>
  <Icon as={itemIcon} mr={3} fontSize="md" />
  <Box fontSize="sm" whiteSpace="nowrap">
    {name}
  </Box>
</Flex>
```

## 📱 Responsive Considerations

### Grid Layouts

```typescript
<Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={6}>
  {/* Responsive grid items */}
</Grid>
```

### Mobile Adaptations

- Use consistent spacing scales that work on mobile
- Ensure touch targets are adequately sized
- Test icon sizes for readability on small screens

## ⚡ Performance Guidelines

### Backdrop Filters

- Use sparingly for main containers only
- Prefer `blur(5px)` for subtle effects
- Avoid on frequently re-rendered components

### Color Usage

- Leverage Chakra's color tokens for consistency
- Use rgba colors for transparency effects
- Maintain sufficient contrast ratios

## 📋 Copy Functionality

### **Always Include Copy Buttons**

For converter tools and any input fields, **always include copy buttons** to enhance user experience:

- **All input fields** should have copy functionality for consistency
- **All output/readonly fields** should have copy functionality
- **Calculated results** should be easily copyable
- **Hash outputs** and **address results** are prime candidates for copy buttons
- Use our standardized `InputField` component for consistency throughout the page

### **Copy Button Styling**

```typescript
// Copy buttons should be subtle but accessible
<InputRightElement pr={1}>
  <CopyToClipboard textToCopy={value ?? ""} />
</InputRightElement>
```

### **When to Include Copy Buttons**

- ✅ **All input fields** (users can copy what they've typed)
- ✅ **All converter outputs** (hex results, hash outputs, padded values)
- ✅ **Generated addresses** and **checksummed addresses**
- ✅ **Calculation results** from Uniswap tools
- ✅ **Any readonly/computed fields**
- ✅ **Configuration inputs** (settings, parameters)
- 🎯 **Use InputField for ALL fields** to maintain visual and functional consistency

### Input Fields with Copy Functionality

Use the `InputField` component for **all input fields** for consistent styling and copy functionality:

```typescript
import { InputField } from "@/components/InputField";

// For ALL fields - both input and output
<InputField
  placeholder="Enter or view value here"
  value={value}
  onChange={handleChange}
  isReadOnly={isOutput} // Only set for computed results
  cursor={isOutput ? "text" : undefined}
  autoFocus={isPrimaryInput}
/>;

// No longer recommended - use InputField instead
// <Input ... />
```

### Standard Input Styling

All input styling is now handled by the `InputField` component automatically:

```typescript
// Standard input props are now built into InputField
// No need to specify these manually:
// bg="whiteAlpha.50"
// border="1px solid"
// borderColor="whiteAlpha.200"
// _hover={{ borderColor: "whiteAlpha.300" }}
// _focus={{ borderColor: "blue.400", boxShadow: "..." }}
// color="gray.100"
// _placeholder={{ color: "gray.500" }}
// fontSize="lg"
// py={3}
```

## 🔄 Consistency Rules

1. **Always use the established color palette** - don't introduce new colors without updating this guide
2. **Maintain spacing consistency** - use the defined spacing scale
3. **Icon sizing should match context** - page headers get larger icons than inline elements
4. **Glass-morphism effects are for containers only** - not individual components
5. **Max widths prevent content stretching** - always constrain wide layouts
6. **Seamless sidebars** - no backgrounds or borders that create visual disconnects
7. **Prioritize simplicity** - use single-column layouts for simple workflows
8. **One color per simple tool** - avoid cognitive overload with multiple accent colors
9. **Copy functionality is essential** - use InputField component for ALL fields
10. **Consistent input styling** - use InputField for all input and output fields
11. **Visual consistency** - every field should have the same interaction patterns

## 🎯 Converter Page Pattern

### Complete Converter Input Row

```typescript
<HStack
  spacing={4}
  p={4}
  bg="whiteAlpha.50" // or "whiteAlpha.100" for highlighted rows
  borderRadius="lg"
  border="1px solid"
  borderColor="whiteAlpha.200"
>
  <Box minW="120px">
    <VStack spacing={1} align="start">
      <HStack spacing={2}>
        <Icon as={IconComponent} color="blue.400" boxSize={4} />
        <Text color="gray.300" fontWeight="medium">
          {label}
        </Text>
      </HStack>
      {badge && (
        <Badge colorScheme="blue" fontSize="xs" px={2} py={0.5}>
          {badge}
        </Badge>
      )}
    </VStack>
  </Box>
  <Box flex={1}>
    {isOutput ? (
      <InputField
        placeholder={`${label} will appear here`}
        value={value}
        onChange={() => {}}
        isReadOnly
        cursor="text"
        // ...standard input props
      />
    ) : (
      <Input
        placeholder={`Enter ${label.toLowerCase()}`}
        value={value}
        onChange={handleChange}
        autoFocus={isPrimary}
        // ...standard input props
      />
    )}
  </Box>
  {rightElement && <Box>{rightElement}</Box>}
</HStack>
```

## 🎨 Tools-Specific Conventions

### Simple Converters (ETH, Hex, etc.)

- **Layout**: Single-column with one input per line
- **Color**: Consistent `blue.400` throughout
- **Pattern**: Label + Input + Optional Right Element
- **Width**: `maxW="800px"` for optimal readability

### Tick to Price

- **Icon**: `FiBarChart` in `blue.400`
- **Focus**: Data conversion and readability

### Pool Price to Target

- **Icon**: `FiTarget` in `orange.400`
- **Focus**: Goal-oriented actions and targeting

### Add Liquidity

- **Icon**: `FiDroplet` in `blue.400`
- **Focus**: Liquidity provision and financial actions

---

_This guide should be referenced when creating new components or modifying existing ones to ensure visual consistency across the Swiss Knife application._
