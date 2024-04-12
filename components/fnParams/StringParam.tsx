import React from "react";
import { InputField } from "../InputField";

interface Params {
  value: any;
}

export const StringParam = ({ value }: Params) => {
  return (
    <InputField value={value} placeholder="" isReadOnly onChange={() => {}} />
  );
};
