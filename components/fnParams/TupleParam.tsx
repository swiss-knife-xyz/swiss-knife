import React from "react";
import { Box, HStack } from "@chakra-ui/react";
import { renderParams } from "@/app/calldata/decoder/page";
import { JsonFragmentType } from "@ethersproject/abi";

interface Params {
  input: JsonFragmentType;
  value: any;
}

export const TupleParam = ({ input, value }: Params) => {
  return input.components ? (
    input.components.length > 0 ? (
      <>
        {input.components.map((component, i) => {
          return renderParams(i, component, value[i]);
        })}
      </>
    ) : (
      <></>
    )
  ) : (
    <></>
  );
};
