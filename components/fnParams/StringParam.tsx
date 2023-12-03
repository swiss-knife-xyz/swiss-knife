import React from "react";
import { InputField } from "../InputField";

interface Params {
  value: string;
}

// TODO: add hex conversions
export const StringParam = ({ value }: Params) => {
  return (
    <InputField value={value} placeholder="" isReadOnly onChange={() => {}} />
  );
};
