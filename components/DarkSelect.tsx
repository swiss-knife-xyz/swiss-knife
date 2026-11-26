import { useCompactParameterInputs } from "./fnParams/ParameterInputStyle";
import { useState, useRef, useId, useCallback, useSyncExternalStore } from "react";
import { Box, BoxProps, HStack, Image, useToken } from "@chakra-ui/react";
import {
  Select as RSelect,
  CreatableSelect,
  OptionsOrGroups,
  GroupBase,
  SingleValue,
  chakraComponents,
  OptionProps,
  SingleValueProps,
  MenuProps,
} from "chakra-react-select";
import { SelectedOption, SelectedOptionState } from "@/types";

export interface DarkSelectProps {
  placeholder?: string;
  ariaLabel?: string;
  optionCounts?: Record<string, number>;
  showOptionValue?: boolean;
  options: OptionsOrGroups<SelectedOption, GroupBase<SelectedOption>>;
  selectedOption: SelectedOptionState;
  setSelectedOption: (value: SelectedOptionState) => void;
  boxProps?: BoxProps;
  size?: "sm" | "md" | "lg";
  controlProps?: Pick<BoxProps, "h" | "minH" | "borderRadius" | "fontSize">;
  // Widen only the portaled options menu, keeping the control's layout intact.
  menuMinWidth?: number;
  menuAlign?: "left" | "right";
  menuFooter?: (closeMenu: () => void) => React.ReactNode;
  isCreatable?: boolean;
  disableMouseNavigation?: boolean;
  editableValue?: string;
  onEditableValueChange?: (value: string) => void;
  autoFocus?: boolean;
  openMenuOnFocus?: boolean;
  isInvalid?: boolean;
  isDisabled?: boolean;
  onKeyDown?: React.KeyboardEventHandler;
}

export type FormatSelectProps = Pick<
  DarkSelectProps,
  "size" | "controlProps" | "boxProps"
>;

const subscribeToClientRender = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export const DarkSelect = ({
  placeholder,
  ariaLabel,
  optionCounts,
  showOptionValue,
  options,
  selectedOption,
  setSelectedOption,
  boxProps,
  size: requestedSize,
  controlProps,
  menuMinWidth,
  menuAlign = "left",
  menuFooter,
  isCreatable,
  disableMouseNavigation,
  editableValue,
  onEditableValueChange,
  autoFocus,
  openMenuOnFocus,
  isInvalid,
  isDisabled,
  onKeyDown,
}: DarkSelectProps) => {
  const compact = useCompactParameterInputs();
  const size = requestedSize ?? (compact ? "sm" : "md");
  // Body-portaled menus stay below modal overlays; menus inside dialogs keep
  // their existing portal target and participate in that dialog's stack.
  const [dropdownZIndex] = useToken("zIndices", ["dropdown"]);
  const [menuPortalTarget, setMenuPortalTarget] = useState<HTMLElement | null>(
    null
  );
  const [menuIsOpen, setMenuIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  // Only SSR/hydration needs a placeholder. Controls created by async decodes
  // are already client-side and must be interactive on their first render.
  const isClient = useSyncExternalStore(subscribeToClientRender, clientSnapshot, serverSnapshot);
  const selectRef = useRef<any>(null);
  const uniqueId = useId();

  // Keep menus within a modal's focus trap and stacking context when present.
  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      setMenuPortalTarget(
        node.closest<HTMLElement>('[role="dialog"]') ?? document.body
      );
    }
  }, []);

  const handleMenuOpen = () => {
    setMenuIsOpen(true);
  };

  const handleMenuClose = () => {
    setMenuIsOpen(false);
    setIsEditing(false);
  };

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      // Enter selects a suggestion while the menu is open; it must not also
      // submit the containing contract function.
      if (editableValue !== undefined && menuIsOpen && event.key === "Enter")
        return;
      onKeyDown?.(event);
      if (disableMouseNavigation) {
        if (
          event.key === "ArrowUp" ||
          event.key === "ArrowDown" ||
          event.key === "Enter"
        ) {
          event.preventDefault();
        }
      }
    },
    [disableMouseNavigation, editableValue, menuIsOpen, onKeyDown]
  );

  const commonChakraStyles = {
    container: (provided: any) => ({
      ...provided,
      color: "white",
    }),
    control: (provided: any, state: any) => ({
      ...provided,
      bg: "whiteAlpha.50",
      borderColor: isInvalid
        ? "red.400"
        : state.isFocused
          ? "blue.400"
          : "whiteAlpha.200",
      borderRadius: "lg",
      ...(compact
        ? { h: 8, minH: 8, borderRadius: "md", fontSize: "13px" }
        : {}),
      ...controlProps,
      boxShadow: state.isFocused
        ? "0 0 0 1px var(--chakra-colors-blue-400)"
        : "none",
      _hover: {
        bg: "whiteAlpha.100",
        borderColor: "whiteAlpha.400",
      },
    }),
    groupHeading: (provided: any) => ({
      ...provided,
      color: "whiteAlpha.500",
      fontSize: "0.65rem",
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      // Each heading sticks within its own group, so the next group pushes it out.
      position: "sticky",
      top: 0,
      zIndex: 1,
      bg: "#18181B",
      margin: 0,
      px: 3,
      pt: 2,
      pb: 1,
    }),
    menuList: (provided: any) => ({
      ...provided,
      ...(options.some((option) => "options" in option) ? { py: 0 } : {}),
      bg: "#18181B",
      border: "1px solid",
      borderColor: "whiteAlpha.200",
      borderRadius: controlProps?.borderRadius ?? "lg",
      ...(controlProps?.fontSize ? { fontSize: controlProps.fontSize } : {}),
      boxShadow: "lg",
      ...(menuFooter
        ? {
            border: 0,
            borderRadius: 0,
            boxShadow: "none",
            maxHeight: `calc(${typeof provided.maxHeight === "number" ? `${provided.maxHeight}px` : (provided.maxHeight ?? "300px")} - 52px)`,
          }
        : {}),
      zIndex: dropdownZIndex,
    }),
    menu: (provided: any) => ({
      ...provided,
      position: "absolute",
      ...(menuFooter
        ? {
            bg: "#18181B",
            border: "1px solid",
            borderColor: "whiteAlpha.200",
            borderRadius: controlProps?.borderRadius ?? "lg",
            boxShadow: "lg",
            overflow: "hidden",
          }
        : {}),
      zIndex: dropdownZIndex,
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      color: "white",
      bg: state.isFocused ? "whiteAlpha.200" : "transparent",
      _hover: {
        bg: disableMouseNavigation ? "transparent" : "whiteAlpha.200",
      },
      pointerEvents: disableMouseNavigation ? "none" : "auto",
    }),
    singleValue: (provided: any) => ({
      ...provided,
      color: "white",
    }),
    input: (provided: any) => ({
      ...provided,
      color: "white",
      // Editable selects display their hex in the input itself. React Select
      // normally hides that input after selection in favour of SingleValue.
      ...(editableValue !== undefined
        ? { fontFamily: "mono", opacity: 1 }
        : {}),
      bg: "transparent",
      boxShadow: "none",
      _focus: { outline: "none", boxShadow: "none", bg: "transparent" },
      _focusVisible: {
        outline: "none",
        boxShadow: "none",
        bg: "transparent",
      },
    }),
    placeholder: (provided: any) => ({
      ...provided,
      color: "whiteAlpha.500",
    }),
    dropdownIndicator: (provided: any) => ({
      ...provided,
      color: "whiteAlpha.700",
      _hover: {
        color: "white",
      },
    }),
    indicatorSeparator: (provided: any) => ({
      ...provided,
      bg: "whiteAlpha.200",
    }),
  };

  const SelectComponent = isCreatable ? CreatableSelect : RSelect;

  const customComponents = {
    ...(menuFooter
      ? {
          Menu: (props: MenuProps<SelectedOption, false>) => (
            <chakraComponents.Menu {...props}>
              {props.children}
              <Box borderTop="1px solid" borderColor="whiteAlpha.100">
                {menuFooter(handleMenuClose)}
              </Box>
            </chakraComponents.Menu>
          ),
        }
      : {}),
    Option: (props: OptionProps<SelectedOption, false>) => (
      <chakraComponents.Option {...props}>
        <HStack
          spacing={3}
          w={optionCounts || showOptionValue ? "full" : undefined}
        >
          {props.data.image && (
            <Image
              src={props.data.image}
              alt={props.data.label}
              w="1.25rem"
              h="1.25rem"
              bg="white"
              rounded="full"
              flexShrink={0}
            />
          )}
          <Box as="span" minW={0}>
            {props.data.label}
          </Box>
          {showOptionValue && (
            <Box
              as="span"
              ml="auto"
              fontFamily="mono"
              fontSize="xs"
              color="whiteAlpha.600"
              flexShrink={0}
            >
              {String(props.data.value)}
            </Box>
          )}
          {optionCounts?.[String(props.data.value)] !== undefined && (
            <Box
              as="span"
              ml="auto"
              color="whiteAlpha.500"
              fontSize="xs"
              flexShrink={0}
            >
              {optionCounts[String(props.data.value)]}
            </Box>
          )}
        </HStack>
      </chakraComponents.Option>
    ),
    SingleValue: (props: SingleValueProps<SelectedOption, false>) => (
      <chakraComponents.SingleValue {...props}>
        <HStack spacing={2}>
          {props.data.image && (
            <Image
              src={props.data.image}
              alt={props.data.label}
              w="1.25rem"
              h="1.25rem"
              bg="white"
              rounded="full"
              flexShrink={0}
            />
          )}
          <span>{props.data.label}</span>
        </HStack>
      </chakraComponents.SingleValue>
    ),
  };

  // Prevent hydration mismatch by not rendering select on server
  if (!isClient) {
    return (
      <Box cursor="pointer" pos="relative" overflow="visible" {...boxProps}>
        <Box
          bg="whiteAlpha.50"
          border="1px solid"
          borderColor="whiteAlpha.200"
          borderRadius="lg"
          h={size === "sm" ? "32px" : size === "lg" ? "48px" : "40px"}
          {...controlProps}
          px={4}
          display="flex"
          alignItems="center"
          color="whiteAlpha.500"
        >
          {selectedOption?.label || placeholder || "Select..."}
        </Box>
      </Box>
    );
  }

  return (
    <Box
      ref={setContainerRef}
      cursor="pointer"
      pos="relative"
      overflow="visible"
      {...boxProps}
    >
      <SelectComponent
        aria-label={ariaLabel}
        aria-invalid={isInvalid || undefined}
        instanceId={uniqueId}
        ref={selectRef}
        options={options}
        value={selectedOption}
        inputValue={editableValue}
        controlShouldRenderValue={editableValue === undefined}
        onInputChange={(next, meta) => {
          if (meta.action === "input-change" && editableValue !== undefined) {
            setIsEditing(true);
            onEditableValueChange?.(next);
          }
        }}
        autoFocus={autoFocus}
        openMenuOnFocus={openMenuOnFocus}
        {...(editableValue !== undefined
          ? {
              filterOption: (
                option: { label: string; value: string },
                query: string
              ) =>
                !isEditing ||
                query === String(selectedOption?.value) ||
                `${option.label} ${option.value}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
            }
          : {})}
        onChange={(option) => {
          setIsEditing(false);
          setSelectedOption(option as SingleValue<SelectedOption>);
        }}
        onFocus={() => setIsEditing(false)}
        onMenuOpen={handleMenuOpen}
        onMenuClose={handleMenuClose}
        defaultValue={selectedOption}
        menuIsOpen={menuIsOpen}
        placeholder={placeholder}
        size={size}
        tagVariant="solid"
        chakraStyles={commonChakraStyles}
        styles={{
          menuPortal: (provided: any) => {
            const portalStyle = { ...provided, zIndex: dropdownZIndex };
            if (menuMinWidth === undefined) return portalStyle;
            const viewportWidth = document.documentElement.clientWidth;
            const width = Math.min(
              Math.max(provided.width ?? 0, menuMinWidth),
              Math.max(0, viewportWidth - 16)
            );
            const left =
              menuAlign === "right"
                ? (provided.left ?? 0) + (provided.width ?? 0) - width
                : (provided.left ?? 0);
            return {
              ...portalStyle,
              width,
              left: Math.max(8, Math.min(left, viewportWidth - width - 8)),
            };
          },
        }}
        closeMenuOnSelect
        useBasicStyles
        menuPortalTarget={menuPortalTarget}
        isSearchable
        {...(editableValue !== undefined
          ? {
              noOptionsMessage: () => "Custom interface IDs are accepted",
            }
          : {})}
        menuPosition="fixed"
        menuPlacement={menuFooter ? "auto" : "bottom"}
        onKeyDown={handleKeyDown}
        isDisabled={isDisabled || disableMouseNavigation}
        components={customComponents}
      />
    </Box>
  );
};
