import React from "react";
import { BigNumber } from "ethers";
import { InputField } from "../InputField";

interface Params {
  value: string | number | BigNumber;
}

// TODO: add ethers unit conversions
export const UintParam = ({ value }: Params) => {
  value = BigNumber.isBigNumber(value) ? value.toString() : value;

  return (
    <InputField
      value={value.toString()}
      placeholder=""
      isReadOnly
      onChange={() => {}}
    />
  );
};
