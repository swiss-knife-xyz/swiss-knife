import { Box, Button, HStack, InputProps, Spacer } from "@chakra-ui/react";
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
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const BytesInput = ({
  input,
  value,
  onChange,
  suggestions,
  ...props
}: InputFieldProps) => {
  // Parse fixed size from type (e.g. "bytes32" → 32, "bytes" → null)
  const fixedMatch = input.type?.match(/^bytes(\d+)$/);
  const fixedSize = fixedMatch ? parseInt(fixedMatch[1]) : null;

  const fillZero = (byteCount: number) => {
    onChange({
      target: { value: "0x" + "00".repeat(byteCount) },
    } as any);
  };

  return (
    <Box>
      <InputInfo input={input} />
      {suggestions ? (
        <HStack spacing={2}>
          <DarkSelect
            ariaLabel={String(input.name || input.type)}
            placeholder="0x…"
            options={suggestions}
            showOptionValue
            selectedOption={
              suggestions.find(
                (option) =>
                  String(option.value).toLowerCase() === value?.toLowerCase()
              ) ?? null
            }
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
              props.onKeyDown?.(event as React.KeyboardEvent<HTMLInputElement>)
            }
            controlProps={{ h: 10, minH: 10 }}
            boxProps={{ flex: 1, minW: 0 }}
          />
          <CopyToClipboard textToCopy={value ?? ""} />
        </HStack>
      ) : (
        <InputField
          value={value}
          placeholder=""
          onChange={onChange}
          {...props}
        />
      )}
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
