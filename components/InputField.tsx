import {
  Input,
  InputGroup,
  InputRightElement,
  InputProps,
  Textarea,
  TextareaProps,
  Tooltip,
  Box,
  Portal,
} from "@chakra-ui/react";
import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { CopyToClipboard } from "@/components/CopyToClipboard";

interface SingleLineInputFieldProps extends InputProps {
  multiline?: false;
  placeholder: string;
  value?: string;
  copyValue?: string;
  valueTooltip?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  InputLeftElement?: React.ReactNode;
}

interface MultilineInputFieldProps extends TextareaProps {
  multiline: true;
  placeholder: string;
  value?: string;
  copyValue?: string;
  valueTooltip?: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  InputLeftElement?: React.ReactNode;
}

type InputFieldProps = SingleLineInputFieldProps | MultilineInputFieldProps;

export const InputField = (props: InputFieldProps) => {
  const { value, isInvalid, InputLeftElement: LeftElement } = props;
  const [tooltipPointer, setTooltipPointer] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const styles = {
    pr: "3rem",
    bg: "whiteAlpha.50",
    border: "1px solid",
    borderColor: isInvalid ? "red.500" : "whiteAlpha.200",
    borderRadius: "lg",
    _hover: {
      bg: "whiteAlpha.100",
      borderColor: isInvalid ? "red.500" : "whiteAlpha.400",
    },
    _focus: {
      bg: "whiteAlpha.50",
      borderColor: isInvalid ? "red.500" : "blue.400",
      boxShadow: isInvalid
        ? "0 0 0 1px var(--chakra-colors-red-500)"
        : "0 0 0 1px var(--chakra-colors-blue-400)",
    },
    color: "white",
    _placeholder: { color: "whiteAlpha.500" },
    fontSize: "md",
    py: 3,
    transition: "all 0.2s",
  } satisfies InputProps;

  let control;
  if (props.multiline) {
    const { multiline, InputLeftElement, copyValue, valueTooltip, ...rest } = props;
    control = (
      <Textarea
        {...styles}
        rows={4}
        resize="vertical"
        {...rest}
        value={value ?? ""}
      />
    );
  } else {
    const { multiline, InputLeftElement, copyValue, valueTooltip, ...rest } = props;
    control = (
      <Input
        {...styles}
        type={props.type ?? "text"}
        {...rest}
        value={value ?? ""}
      />
    );
  }

  return (
    <InputGroup>
      {LeftElement}
      {props.valueTooltip ? (
        <Box
          display="contents"
          onPointerMove={(event) => {
            if (event.pointerType === "mouse") {
              setTooltipPointer({ x: event.clientX, y: event.clientY });
            }
          }}
          onPointerLeave={() => setTooltipPointer(null)}
        >
          <Tooltip
            label={props.valueTooltip}
            placement="top"
            fontFamily="mono"
            bg="bg.subtle"
            color="text.secondary"
            border="1px solid"
            borderColor="whiteAlpha.200"
            isDisabled={!!tooltipPointer}
          >
            {control}
          </Tooltip>
          {tooltipPointer && (
            <Portal>
              <Box
                role="tooltip"
                position="fixed"
                left={`${tooltipPointer.x}px`}
                top={`${tooltipPointer.y - 12}px`}
                transform="translate(-50%, -100%)"
                pointerEvents="none"
                zIndex="tooltip"
                bg="bg.subtle"
                color="text.secondary"
                border="1px solid"
                borderColor="whiteAlpha.200"
                px={2}
                py={1}
                borderRadius="md"
                fontFamily="mono"
                fontSize="sm"
                boxShadow="md"
                whiteSpace="nowrap"
              >
                {props.valueTooltip}
              </Box>
            </Portal>
          )}
        </Box>
      ) : (
        control
      )}
      <InputRightElement pr={1} h={props.multiline ? "10" : "full"}>
        {!isInvalid ? (
          <CopyToClipboard textToCopy={props.copyValue ?? value ?? ""} />
        ) : (
          <AlertCircle size={18} color="var(--chakra-colors-red-400)" />
        )}
      </InputRightElement>
    </InputGroup>
  );
};
