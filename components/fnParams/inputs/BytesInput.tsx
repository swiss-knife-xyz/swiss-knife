import type { ReactNode } from "react";
import {
  Box,
  Button,
  HStack,
  InputProps,
  Spacer,
  Text,
} from "@chakra-ui/react";
import { InputField } from "@/components/InputField";
import { InputInfo } from "./InputInfo";
import { JsonFragment } from "ethers";
import { DarkSelect } from "@/components/DarkSelect";
import { CopyToClipboard } from "@/components/CopyToClipboard";
import type { SelectedOption } from "@/types";

interface InputFieldProps extends InputProps {
  input: JsonFragment;
  value?: string;
  suggestions?: SelectedOption[];
  headerAction?: ReactNode;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const BytesInput = ({
  input,
  value,
  onChange,
  suggestions,
  headerAction,
  ...props
}: InputFieldProps) => {
  // Parse fixed size from type (e.g. "bytes32" → 32, "bytes" → null)
  const fixedMatch = input.type?.match(/^bytes(\d+)$/);
  const fixedSize = fixedMatch ? parseInt(fixedMatch[1]) : null;
  const selectedSuggestion =
    suggestions?.find(
      (option) => String(option.value).toLowerCase() === value?.toLowerCase()
    ) ?? null;

  const fillZero = (byteCount: number) => {
    onChange({
      target: { value: "0x" + "00".repeat(byteCount) },
    } as any);
  };

  return (
    <Box>
      <Box
        display={suggestions ? "grid" : "block"}
        gridTemplateColumns="minmax(0, 1fr) auto"
        columnGap={2}
        rowGap={1}
        alignItems="center"
        sx={
          headerAction
            ? {
                "&:hover input, &:hover .bytes-builder-action": {
                  borderColor: props.isInvalid ? "red.500" : "whiteAlpha.400",
                },
                "&:focus-within input, &:focus-within .bytes-builder-action": {
                  borderColor: props.isInvalid ? "red.500" : "blue.400",
                },
              }
            : undefined
        }
      >
        <HStack
          gridColumn={1}
          gridRow={1}
          justify="space-between"
          align={headerAction ? "center" : "baseline"}
          spacing={3}
          flexWrap={headerAction ? "nowrap" : "wrap"}
          mb={0}
        >
          <Box minW={0} flex={headerAction ? 1 : undefined}>
            <InputInfo input={input} />
          </Box>
          {selectedSuggestion && (
            <Text
              fontSize="sm"
              fontWeight="medium"
              color="text.secondary"
              ml="auto"
              textAlign="right"
            >
              {selectedSuggestion.label}
            </Text>
          )}
          {headerAction}
        </HStack>
        {suggestions ? (
          <>
            <DarkSelect
              ariaLabel={String(input.name || input.type)}
              placeholder="0x…"
              options={suggestions}
              showOptionValue
              selectedOption={selectedSuggestion}
              setSelectedOption={(option) =>
                onChange({
                  target: { value: String(option?.value ?? "") },
                } as React.ChangeEvent<HTMLInputElement>)
              }
              editableValue={value ?? ""}
              onEditableValueChange={(next) =>
                onChange({
                  target: { value: next },
                } as React.ChangeEvent<HTMLInputElement>)
              }
              openMenuOnFocus
              isInvalid={props.isInvalid}
              onKeyDown={(event) =>
                props.onKeyDown?.(
                  event as React.KeyboardEvent<HTMLInputElement>
                )
              }
              controlProps={{ h: 10, minH: 10 }}
              boxProps={{ gridColumn: 1, gridRow: 2, minW: 0 }}
            />
            <Box gridColumn={2} gridRow={2}>
              <CopyToClipboard textToCopy={value ?? ""} />
            </Box>
          </>
        ) : (
          <InputField
            value={value}
            placeholder=""
            onChange={onChange}
            {...props}
            {...(headerAction
              ? {
                  bg: "bg.subtle",
                  borderTopRightRadius: 0,
                  _hover: { bg: "bg.subtle" },
                  _focus: { bg: "bg.subtle", boxShadow: "none" },
                }
              : {})}
          />
        )}
      </Box>
      <HStack my={2}>
        <Spacer />
        {fixedSize ? (
          <Button
            onClick={() => fillZero(fixedSize)}
            size={"sx"}
            fontWeight={"thin"}
            variant={"ghost"}
            color="whiteAlpha.300"
          >
            [zero]
          </Button>
        ) : (
          <Button
            onClick={() => fillZero(32)}
            size={"sx"}
            fontWeight={"thin"}
            variant={"ghost"}
            color="whiteAlpha.300"
          >
            [zero-32]
          </Button>
        )}
      </HStack>
    </Box>
  );
};
