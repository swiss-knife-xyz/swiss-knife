import { useEffect, useState, useRef, useId, useCallback } from "react";
import { Box, ColorProps, BoxProps } from "@chakra-ui/react";
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

const selectBg: ColorProps["color"] = "whiteAlpha.200";
const selectHover: ColorProps["color"] = "whiteAlpha.400";

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
      bg: "blackAlpha.100",
      color: "white",
    }),
    groupHeading: (provided: any) => ({
      ...provided,
      h: "1px",
      borderTop: "1px solid white",
      bg: selectBg,
    }),
    menuList: (provided: any) => ({
      ...provided,
      bg: "black",
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
      bg: state.isFocused ? selectHover : selectBg,
      _hover: {
        bg: disableMouseNavigation ? "transparent" : selectHover,
      },
      pointerEvents: disableMouseNavigation ? "none" : "auto",
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
