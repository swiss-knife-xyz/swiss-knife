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

export interface RenderInputFieldsProps {
  chainId: number;
  input: JsonFragmentType;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setReadIsDisabled: (value: boolean) => void;
  isError: boolean;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const renderInputFields = ({
  chainId,
  input,
  value,
  onChange,
  setReadIsDisabled,
  isError,
  onKeyDown,
}: RenderInputFieldsProps) => {
  const isInvalid =
    isError &&
    (value === undefined ||
      value === null ||
      value.toString().trim().length === 0);

  if (input.type?.includes("int")) {
    return (
      <IntInput
        input={input}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        isInvalid={isInvalid}
        readFunctionIsError={isError}
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
        setReadIsDisabled={setReadIsDisabled}
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
      // <TupleInput
      //   chainId={chainId}
      //   input={input}
      //   value={value}
      //   onChange={onChange}
      //   readIsDisabled={readIsDisabled}
      //   setReadIsDisabled={setReadIsDisabled}
      //   onKeyDown={onKeyDown}
      //   isInvalid={isInvalid}
      //   isError={isError}
      // />
      <></>
    );
  } else if (input.type?.endsWith("[]")) {
    return (
      <ArrayInput
        input={input}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        isInvalid={isInvalid}
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
  if (type.includes("uint")) {
    return <UintParam value={value} />;
  } else if (type.includes("int")) {
    return <IntParam value={value} />;
  } else if (type === "address") {
    return <AddressParam address={value} showLink chainId={chainId} />;
  } else if (type.includes("bytes")) {
    // account for cases where the bytes value is just an address
    if (isAddress(value)) {
      return <AddressParam address={value} />;
    } else {
      return (
        <BytesParam
          arg={
            value === null || value === undefined
              ? value
              : { rawValue: value, value: { decoded: null } }
          }
        />
      );
    }
  } else if (type === "tuple") {
    return <TupleParam arg={{ value }} />;
  } else if (type === "array") {
    return <ArrayParam arg={{ rawValue: value, value }} />;
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
