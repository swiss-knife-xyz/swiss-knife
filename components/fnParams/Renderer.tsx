import { contractOutputArg } from "@/lib/contractOutput";
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
import type { SelectedOption } from "@/types";
import { ContractBytesInput } from "./ContractBytesInput";

export interface RenderInputFieldsProps {
  chainId: number;
  input: JsonFragmentType;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setFunctionIsDisabled: (value: boolean) => void;
  isError: boolean;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  isArrayChild?: boolean;
  suggestions?: SelectedOption[];
  allowBytesBuilder?: boolean;
  immediateUpdates?: boolean;
  rawValues?: boolean;
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
  suggestions,
  allowBytesBuilder = false,
  immediateUpdates,
  rawValues,
}: RenderInputFieldsProps) => {
  const isInvalid =
    isError &&
    (value === undefined ||
      value === null ||
      value.toString().trim().length === 0);

  if (/\[\d*\]$/.test(input.type ?? "")) {
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
        allowBytesBuilder={allowBytesBuilder}
        immediateUpdates={immediateUpdates}
        rawValues={rawValues}
      />
    );
  } else if (input.type === "bytes" && allowBytesBuilder) {
    return (
      <ContractBytesInput
        input={input}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        isInvalid={isInvalid}
      />
    );
  } else if (input.type?.includes("bytes")) {
    return (
      <BytesInput
        suggestions={suggestions}
        input={input}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        isInvalid={isInvalid}
      />
    );
  } else if (
    rawValues &&
    (input.type?.includes("int") || input.type === "address")
  ) {
    // Local ABI values only: no conversion drafts, ENS resolution or address metadata reads.
    return (
      <StringInput
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
        allowBytesBuilder={allowBytesBuilder}
        immediateUpdates={immediateUpdates}
        rawValues={rawValues}
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
  components,
  name,
}: {
  chainId: number;
  type: string;
  value: any;
  components?: readonly JsonFragmentType[];
  name?: string;
}) => {
  console.log({
    chainId,
    type,
    value,
  });

  if (/\[\d*\]$/.test(type) || type === "tuple") {
    const arg = value == null ? value : contractOutputArg({ type, components, name }, value);
    return type === "tuple" ? (
      <TupleParam arg={arg} chainId={chainId} />
    ) : (
      <ArrayParam arg={arg} chainId={chainId} />
    );
  } else if (type === "calldata") {
    return <CalldataParam value={value} chainId={chainId} variant="plain" />;
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
