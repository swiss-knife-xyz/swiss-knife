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
import { ParamValue } from "../decodedParams/ParamValue";
import { Skeleton } from "@chakra-ui/react";
import { CalldataTree } from "../decodedParams/CalldataTree";
import { CalldataParam } from "../decodedParams/CalldataParam";
import type { SelectedOption } from "@/types";
import { ContractBytesInput } from "./ContractBytesInput";

export interface RenderInputFieldsProps {
  ariaLabel?: string;
  onValidationChange?: (isInvalid: boolean) => void;
  isInvalid?: boolean;
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
  ariaLabel,
  onValidationChange,
  isInvalid: explicitInvalid,
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
  const isInvalid = explicitInvalid ?? (
    isError &&
    (value === undefined ||
      value === null ||
      value.toString().trim().length === 0));

  if (/\[\d*\]$/.test(input.type ?? "")) {
    return (
      <ArrayInput
        chainId={chainId}
        input={input}
        aria-label={ariaLabel}
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
        aria-label={ariaLabel}
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
        aria-label={ariaLabel}
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
        aria-label={ariaLabel}
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
        aria-label={ariaLabel}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        isInvalid={isInvalid}
        onValidationChange={onValidationChange}
        functionIsError={isError}
        setFunctionIsDisabled={setFunctionIsDisabled}
      />
    );
  } else if (input.type === "address") {
    return (
      <AddressInput
        input={input}
        aria-label={ariaLabel}
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
        aria-label={ariaLabel}
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
        aria-label={ariaLabel}
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
        aria-label={ariaLabel}
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
  if (/\[\d*\]$/.test(type) || type === "tuple") {
    return value == null ? <Skeleton h="4rem" w="full" rounded="4px" /> : (
      <CalldataTree args={[contractOutputArg({ type, components, name }, value)]} chainId={chainId} showControls={false} />
    );
  } else if (type === "calldata") {
    return <CalldataParam value={value} chainId={chainId} />;
  } else {
    return <ParamValue arg={contractOutputArg({ type, components, name }, value)} chainId={chainId} />;
  }
};
