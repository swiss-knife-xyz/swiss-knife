"use client";

import React, { useState } from "react";
import { Box, Button } from "@chakra-ui/react";
import type { JsonFragmentType } from "ethers";
import { Wrench } from "lucide-react";
import { useCompactParameterInputs } from "./ParameterInputStyle";
import { BytesInput } from "./inputs/BytesInput";
import { BytesBuilderDialog } from "./BytesBuilderDialog";

/** Typed builder shared by contract fields, the encoder and nested byte payloads. */
export function ContractBytesInput({
  input,
  value,
  onChange,
  ...props
}: {
  input: JsonFragmentType;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  isInvalid: boolean;
}) {
  const compact = useCompactParameterInputs();
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Box>
      <BytesInput
        input={input}
        value={value}
        onChange={onChange}
        {...props}
        headerAction={
          <Button
            className="bytes-builder-action"
            leftIcon={<Wrench size={12} aria-hidden="true" />}
            size="xs"
            variant={compact ? "ghost" : "outline"}
            borderWidth={compact ? 0 : "1px"}
            px={compact ? 1.5 : undefined}
            fontSize={compact ? "xs" : undefined}
            flexShrink={0}
            position="relative"
            zIndex={1}
            h={compact ? 6 : 7}
            color={compact ? "text.secondary" : undefined}
            fontWeight={compact ? "normal" : undefined}
            bg={compact ? "transparent" : "bg.subtle"}
            borderColor={props.isInvalid ? "red.500" : "whiteAlpha.200"}
            borderBottom={0}
            borderTopRadius={compact ? "md" : "lg"}
            borderBottomRadius={compact ? "md" : 0}
            _hover={{ bg: "bg.muted", color: "text.primary" }}
            _active={{ bg: "bg.emphasis" }}
            _after={
              compact
                ? { display: "none" }
                : {
                    content: '""',
                    position: "absolute",
                    bottom: "-1px",
                    left: 0,
                    right: 0,
                    h: "2px",
                    bg: "bg.subtle",
                  }
            }
            onClick={() => setIsOpen(true)}
          >
            Build bytes
          </Button>
        }
      />
      <BytesBuilderDialog
        isOpen={isOpen}
        fieldName={input.name || "bytes"}
        onClose={() => setIsOpen(false)}
        onApply={(bytes) => {
          onChange({
            target: { value: bytes },
          } as React.ChangeEvent<HTMLInputElement>);
          setIsOpen(false);
        }}
      />
    </Box>
  );
}
