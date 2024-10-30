import React from "react";
import { renderParams } from "@/components/renderParams";
import { HStack, Skeleton, Stack } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { Arg, DecodeTupleParamResult } from "@/types";

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
  ) : (
    <></>
  );
};
