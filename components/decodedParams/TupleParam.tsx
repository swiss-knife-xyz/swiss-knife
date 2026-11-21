import React, { useId } from "react";
import { renderParams } from "@/components/renderParams";
import {
  Box,
  Button,
  HStack,
  Skeleton,
  Stack,
  useDisclosure,
} from "@chakra-ui/react";
import { ChevronDownIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { motion } from "framer-motion";
import { Arg, DecodeTupleParamResult } from "@/types";
import { stringify } from "viem";
import { StringParam } from "./StringParam";
import { InputField } from "@/components/InputField";

interface Params {
  arg: Omit<Arg, "value"> & {
    value: DecodeTupleParamResult;
  };
  chainId?: number;
  isArrayChild?: boolean;
}

// Keep disclosure updates separate from decoded children so their UI state is retained.
const TupleDisclosure = ({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) => {
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: true });
  const contentId = useId();
  return (
    <Stack spacing={2}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        alignSelf="flex-start"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={contentId}
        aria-label={`${isOpen ? "Collapse" : "Expand"} tuple${name ? ` ${name}` : ""}`}
      >
        {isOpen ? (
          <ChevronDownIcon
            boxSize={5}
            aria-hidden="true"
            data-disclosure="down"
          />
        ) : (
          <ChevronRightIcon
            boxSize={5}
            aria-hidden="true"
            data-disclosure="right"
          />
        )}
      </Button>
      <Box id={contentId} display={isOpen ? undefined : "none"}>
        {children}
      </Box>
    </Stack>
  );
};

export const TupleParam = ({
  arg: _arg,
  chainId,
  isArrayChild = false,
}: Params) => {
  const showSkeleton = _arg === undefined || _arg === null;
  const arg: Arg = !showSkeleton
    ? _arg
    : { value: [], name: "", baseType: "", type: "", rawValue: "" };

  return showSkeleton ? (
    <HStack w="full">
      <Skeleton
        flexGrow={1}
        height="4rem"
        rounded="md"
        startColor="whiteAlpha.50"
        endColor="whiteAlpha.400"
      />
    </HStack>
  ) : Array.isArray(arg.value) && arg.value.length > 0 ? (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {isArrayChild ? (
        <Stack spacing={2}>
          {arg.value.map((ar: any, i: number) => renderParams(i, ar, chainId))}
        </Stack>
      ) : (
        <TupleDisclosure name={arg.name}>
          <Stack spacing={2}>
            {arg.value.map((ar: any, i: number) =>
              renderParams(i, ar, chainId)
            )}
          </Stack>
        </TupleDisclosure>
      )}
    </motion.div>
  ) : // FIXME: this is a hack to render tuples with objects (for now, to be removed it future)
  // need to fix it by utilizing the components and constructing the tuple values
  // Eg: getOffRamps() that returns an array of tuples (0x141fa059441E0ca23ce184B6A78bafD2A517DdE8, chainId: 42161 Arb One)
  typeof arg.value === "object" &&
    arg.value !== null &&
    Object.keys(arg.value as any).length > 0 ? (
    <StringParam value={stringify(arg.value)} />
  ) : (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ width: "100%" }}
    >
      <InputField
        placeholder=""
        value="()"
        onChange={() => {}}
        isReadOnly
        fontFamily={"mono"}
      />
    </motion.div>
  );
};
