import React from "react";
import { renderParams } from "@/components/renderParams";
import { HStack, Skeleton, Stack } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { Arg, DecodeTupleParamResult } from "@/types";
import { stringify } from "viem";
import { StringParam } from "./StringParam";

interface Params {
  arg: Omit<Arg, "value"> & {
    value: DecodeTupleParamResult;
  };
  chainId?: number;
}

export const TupleParam = ({ arg: _arg, chainId }: Params) => {
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
      <Stack spacing={2}>
        {arg.value.map((ar: any, i: number) => {
          return renderParams(i, ar, chainId);
        })}
      </Stack>
    </motion.div>
  ) : // FIXME: this is a hack to render tuples with objects (for now, to be removed it future)
  // need to fix it by utilizing the components and constructing the tuple values
  // Eg: getOffRamps() that returns an array of tuples (0x141fa059441E0ca23ce184B6A78bafD2A517DdE8, chainId: 42161 Arb One)
  typeof arg.value === "object" && Object.keys(arg.value as any).length > 0 ? (
    <StringParam value={stringify(arg.value)} />
  ) : (
    <></>
  );
};
