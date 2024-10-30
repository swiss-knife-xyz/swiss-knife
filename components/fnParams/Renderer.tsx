import { JsonFragmentType } from "ethers";
import {
  AddressInput,
  ArrayInput,
  BoolInput,
  BytesInput,
  IntInput,
  StringInput,
  TupleInput,
} from "./inputs";
import {
  AddressParam,
  ArrayParam,
  BytesParam,
  IntParam,
  StringParam,
  TupleParam,
  UintParam,
} from "../decodedParams";
import { isAddress } from "viem";
import { CalldataParam } from "../decodedParams/CalldataParam";

export interface RenderInputFieldsProps {
  chainId: number;
  input: JsonFragmentType;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setFunctionIsDisabled: (value: boolean) => void;
  isError: boolean;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  isArrayChild?: boolean;
}

export const renderInputFields = ({
  chainId,
  input,
  value,
  onChange,
  setFunctionIsDisabled,
  isError,
  onKeyDown,
  isArrayChild,
}: RenderInputFieldsProps) => {
  const isInvalid =
    isError &&
    (value === undefined ||
      value === null ||
      value.toString().trim().length === 0);

  if (input.type?.endsWith("[]")) {
    return (
      <ArrayInput
        chainId={chainId}
        input={input}
        value={value}
        onChange={onChange}
        setFunctionIsDisabled={setFunctionIsDisabled}
        onKeyDown={onKeyDown}
        isInvalid={isInvalid}
        isError={isError}
      />
    );
  } else if (input.type?.includes("bytes")) {
    return (
      <BytesInput
        input={input}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        isInvalid={isInvalid}
      />
    );
  } else if (input.type?.includes("int")) {
    return (
      <IntInput
        input={input}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        isInvalid={isInvalid}
        functionIsError={isError}
        setFunctionIsDisabled={setFunctionIsDisabled}
      />
    );
  } else if (input.type === "address") {
    return (
      <AddressInput
        input={input}
        value={value}
        chainId={chainId}
        onChange={onChange}
        onKeyDown={onKeyDown}
        isInvalid={isInvalid}
        setFunctionIsDisabled={setFunctionIsDisabled}
      />
    );
  } else if (input.type === "bool") {
    return (
      <BoolInput
        input={input}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        isInvalid={isInvalid}
      />
    );
  } else if (input.type === "tuple") {
    return (
      <TupleInput
        chainId={chainId}
        input={input}
        value={value}
        onChange={onChange}
        setFunctionIsDisabled={setFunctionIsDisabled}
        onKeyDown={onKeyDown}
        isInvalid={isInvalid}
        isError={isError}
        isArrayChild={isArrayChild}
      />
    );
  } else {
    return (
      <StringInput
        input={input}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        isInvalid={isInvalid}
      />
    );
  }
};

export const renderParamTypes = ({
  chainId,
  type,
  value,
}: {
  chainId: number;
  type: string;
  value: any;
}) => {
  console.log({
    chainId,
    type,
    value,
  });

  if (type.endsWith("[]")) {
    return (
      <ArrayParam
        arg={{
          name: "",
          baseType: "array",
          type,
          rawValue: value,
          value:
            value && Array.isArray(value)
              ? value.map((v: any) => ({
                  name: "",
                  baseType: type.slice(0, type.length - 2),
                  type: type.slice(0, type.length - 2),
                  rawValue: v,
                  value: v,
                }))
              : [],
        }}
        chainId={chainId}
      />
    );
  } else if (type === "tuple") {
    return (
      <TupleParam
        arg={{
          name: "",
          baseType: "tuple",
          type: "tuple",
          rawValue: value,
          value: Array.isArray(value)
            ? value.map((v: any, i: number) => ({
                name: "",
                baseType: v.type,
                type: v.type,
                rawValue: v.value,
                value: v.value,
              }))
            : [],
        }}
        chainId={chainId}
      />
    );
  } else if (type === "calldata") {
    return <CalldataParam value={value} chainId={chainId} />;
  } else if (type.includes("uint")) {
    return <UintParam value={value} />;
  } else if (type.includes("int")) {
    return <IntParam value={value} />;
  } else if (type === "address") {
    return <AddressParam address={value} showLink chainId={chainId} />;
  } else if (type.includes("bytes")) {
    // account for cases where the bytes value is just an address
    if (isAddress(value)) {
      return <AddressParam address={value} chainId={chainId} />;
    } else {
      return (
        <BytesParam
          arg={
            value === null || value === undefined
              ? value
              : { rawValue: value, value: { decoded: null } }
          }
          chainId={chainId}
        />
      );
    }
  } else if (type === "bool") {
    return (
      <StringParam
        value={
          value === null || value === undefined
            ? value
            : value
            ? "true"
            : "false"
        }
      />
    );
  } else {
    return <StringParam value={value} />;
  }
};
