import React from "react";
import { InputField } from "../InputField";

interface Params {
  value: string;
}

// TODO: add ens + avatar
// TODO: add link to swiss-knife explorer (add ExternalIcon on the right)
export const AddressParam = ({ value }: Params) => {
  return (
    <InputField value={value} placeholder="" isReadOnly onChange={() => {}} />
  );
};
