import { useEffect, useState, useRef, useId, useCallback } from "react";
import { Box, BoxProps } from "@chakra-ui/react";
import {
  Select as RSelect,
  CreatableSelect,
  OptionsOrGroups,
  GroupBase,
  SingleValue,
} from "chakra-react-select";
import { SelectedOption, SelectedOptionState } from "@/types";

interface Props {
  placeholder?: string;
  options: OptionsOrGroups<SelectedOption, GroupBase<SelectedOption>>;
  selectedOption: SelectedOptionState;
  setSelectedOption: (value: SelectedOptionState) => void;
  boxProps?: BoxProps;
  isCreatable?: boolean;
  disableMouseNavigation?: boolean;
}

export const DarkSelect = ({
  placeholder,
  options,
  selectedOption,
  setSelectedOption,
  boxProps,
  isCreatable,
  disableMouseNavigation,
}: Props) => {
  const [menuPortalTarget, setMenuPortalTarget] = useState<HTMLElement | null>(
    null
  );
  const [menuIsOpen, setMenuIsOpen] = useState(false);
  const selectRef = useRef<any>(null);
  const uniqueId = useId();

  useEffect(() => {
    if (typeof document !== "undefined") {
      setMenuPortalTarget(document.body);
    }
  }, []);

  const handleMenuOpen = () => {
    setMenuIsOpen(true);
  };

  const handleMenuClose = () => {
    setMenuIsOpen(false);
  };

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
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
    [disableMouseNavigation]
  );

  const commonChakraStyles = {
    container: (provided: any) => ({
      ...provided,
      bg: "whiteAlpha.50",
      color: "white",
    }),
    control: (provided: any, state: any) => ({
      ...provided,
      bg: "whiteAlpha.50",
      borderColor: state.isFocused ? "blue.400" : "whiteAlpha.200",
      borderRadius: "lg",
      boxShadow: state.isFocused ? "0 0 0 1px var(--chakra-colors-blue-400)" : "none",
      _hover: {
        borderColor: "whiteAlpha.400",
      },
    }),
    groupHeading: (provided: any) => ({
      ...provided,
      h: "1px",
      borderTop: "1px solid",
      borderColor: "whiteAlpha.200",
      bg: "whiteAlpha.100",
    }),
    menuList: (provided: any) => ({
      ...provided,
      bg: "#18181B",
      border: "1px solid",
      borderColor: "whiteAlpha.200",
      borderRadius: "lg",
      boxShadow: "lg",
      zIndex: 9999,
    }),
    menu: (provided: any) => ({
      ...provided,
      position: "absolute",
      zIndex: 9999,
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

  return (
    <Box cursor="pointer" pos="relative" overflow="visible" {...boxProps}>
      <SelectComponent
        instanceId={uniqueId}
        ref={selectRef}
        options={options}
        value={selectedOption}
        onChange={
          setSelectedOption as (value: SingleValue<SelectedOption>) => void
        }
        onMenuOpen={handleMenuOpen}
        onMenuClose={handleMenuClose}
        defaultValue={selectedOption}
        menuIsOpen={menuIsOpen}
        placeholder={placeholder}
        size="md"
        tagVariant="solid"
        chakraStyles={commonChakraStyles}
        styles={{
          menuPortal: (provided: any) => ({
            ...provided,
            zIndex: 9999,
          }),
        }}
        closeMenuOnSelect
        useBasicStyles
        menuPortalTarget={menuPortalTarget}
        isSearchable
        menuPosition="fixed"
        onKeyDown={handleKeyDown}
        isDisabled={disableMouseNavigation}
      />
    </Box>
  );
};
