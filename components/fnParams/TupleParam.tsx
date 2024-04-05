import React from "react";
import { ParamType } from "ethers";
import { renderParams } from "@/components/renderParams";
import { Stack } from "@chakra-ui/react";

interface Params {
  input: ParamType;
  value: any;
}

export const TupleParam = ({ input, value }: Params) => {
  return input.components ? (
    input.components.length > 0 ? (
      <Stack spacing={2}>
        {input.components.map((component, i) => {
          return renderParams(i, component, value[i]);
        })}
      </Stack>
    ) : (
      <></>
    )
  ) : (
    <></>
  );
};
