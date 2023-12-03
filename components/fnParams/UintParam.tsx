import React from "react";
import { InputField } from "../InputField";

interface Params {
  value: string | number | bigint;
}

// TODO: add ethers unit conversions
export const UintParam = ({ value }: Params) => {
  value = BigInt(value).toString();

  return (
    <InputField value={value} placeholder="" isReadOnly onChange={() => {}} />
  );
};
