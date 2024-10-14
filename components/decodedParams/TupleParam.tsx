import React from "react";
import { renderParams } from "@/components/renderParams";
import { Stack } from "@chakra-ui/react";

interface Params {
  arg: any;
}

export const TupleParam = ({ arg }: Params) => {
  return arg.value.length > 0 ? (
    <Stack spacing={2}>
      {arg.value.map((ar: any, i: number) => {
        return renderParams(i, ar);
      })}
    </Stack>
  ) : (
    <></>
  );
};
