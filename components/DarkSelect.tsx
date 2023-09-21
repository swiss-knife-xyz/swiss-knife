import { Box, ColorProps, BoxProps } from "@chakra-ui/react";
import {
  Select as RSelect,
  CreatableSelect,
  OptionsOrGroups,
  GroupBase,
} from "chakra-react-select";
import { SelectedOption, SelectedOptionState } from "@/types";

interface Props {
  placeholder?: string;
  options: OptionsOrGroups<SelectedOption, GroupBase<SelectedOption>>;
  selectedOption: SelectedOptionState;
  setSelectedOption: (value: SelectedOptionState) => void;
  boxProps?: BoxProps;
  isCreatable?: boolean;
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
}: Props) => {
  return (
    <Box cursor="pointer" {...boxProps}>
      {isCreatable ? (
        <CreatableSelect
          options={options}
          value={selectedOption}
          onChange={setSelectedOption}
          placeholder={placeholder}
          size="md"
          tagVariant="solid"
          chakraStyles={{
            container: (provided, state) => ({
              ...provided,
              bg: "blackAlpha.100",
              color: "blue.200",
            }),
            groupHeading: (provided, state) => ({
              ...provided,
              h: "1px",
              borderTop: "1px solid white",
              bg: selectBg,
            }),
            menuList: (provided) => ({
              ...provided,
              bg: "black",
            }),
            option: (provided) => ({
              ...provided,
              color: "white",
              bg: selectBg,
              _hover: {
                bg: selectHover,
              },
            }),
          }}
          closeMenuOnSelect
          useBasicStyles
        />
      ) : (
        <RSelect
          options={options}
          value={selectedOption}
          onChange={setSelectedOption}
          placeholder={placeholder}
          size="md"
          tagVariant="solid"
          chakraStyles={{
            container: (provided, state) => ({
              ...provided,
              bg: "blackAlpha.100",
            }),
            groupHeading: (provided, state) => ({
              ...provided,
              h: "1px",
              borderTop: "1px solid white",
              bg: selectBg,
            }),
            menuList: (provided) => ({
              ...provided,
              bg: "black",
            }),
            option: (provided) => ({
              ...provided,
              color: "white",
              bg: selectBg,
              _hover: {
                bg: selectHover,
              },
            }),
          }}
          closeMenuOnSelect
          useBasicStyles
        />
      )}
    </Box>
  );
};
