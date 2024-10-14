import React from "react";
import { renderParams } from "@/components/renderParams";
import { HStack, Skeleton, Stack } from "@chakra-ui/react";
import { motion } from "framer-motion";

interface Params {
  arg: any;
}

export const TupleParam = ({ arg: _arg }: Params) => {
  const showSkeleton = _arg === undefined || _arg === null;
  const arg = !showSkeleton ? _arg : "abcdef1234";

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
  ) : arg.value.length > 0 ? (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Stack spacing={2}>
        {arg.value.map((ar: any, i: number) => {
          return renderParams(i, ar);
        })}
      </Stack>
    </motion.div>
  ) : (
    <></>
  );
};
