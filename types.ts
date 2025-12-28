import { SingleValue } from "chakra-react-select";
import { JsonFragmentType, TransactionDescription } from "ethers";

export interface SelectedOption {
  label: string;
  value: number | string | boolean;
}

export type SelectedOptionState = SingleValue<SelectedOption>;

export interface ExplorersData {
  [label: string]: ExplorerData;
}

export interface ExplorerData {
  urlLayout: string;
  chainIdToLabel: { [chainId: number]: string };
  // some explorer favicons don't automatically work via gstatic
  faviconUrl?: string;
  // some icons can be entirely white in color, which would require the background color to change from white
  faviconWhite?: boolean;
  forContracts?: boolean;
}

export enum ExplorerType {
  ADDRESS,
  TX,
}

export interface ILeaderboard {
  _id: string;
  lastBlockNumber: number;
  totalUSDAmount: number;
  donorsCount: number;
  topDonorsWithEns: { address: string; ens: string; usdAmount: number }[];
}

export type DecodeBytesParamResult = {
  decoded: DecodeRecursiveResult;
};

export type DecodeTupleParamResult =
  | {
      name: string;
      baseType: string;
      type: string;
      rawValue: any;
      value: DecodeParamTypesResult;
    }[]
  | null;

export type DecodeArrayParamResult =
  | {
      name: string;
      baseType: string;
      type: string;
      rawValue: any;
      value: DecodeParamTypesResult;
    }[];

export interface ParsedTransaction extends TransactionDescription {
  txType?: "safeMultiSend";
}

export type DecodeParamTypesResult =
  | string
  | DecodeBytesParamResult
  | DecodeTupleParamResult
  | DecodeArrayParamResult;

export type Arg = {
  name: string;
  baseType: string;
  type: string;
  rawValue: any;
  value: DecodeParamTypesResult;
};

export type DecodeRecursiveResult = {
  functionName: string;
  signature: string;
  rawArgs: any;
  args: Arg[];
} | null;

export type DecodeEventResult = {
  eventName: string;
  signature: string;
  args: Arg[];
} | null;

export type HighlightedText = {
  text: string;
  isHighlighted: boolean;
  isCurrentResult: boolean;
};

export type HighlightedContent = string | HighlightedText[];

export interface ExtendedJsonFragmentType
  extends Omit<JsonFragmentType, "name"> {
  name?: HighlightedContent;
}

export interface SourceCode {
  sources: Record<string, { content: string }>;
}

export interface ContractResult {
  SourceCode: string;
  ContractName: string;
  ABI: string;
  Implementation: string;
}

export interface ContractResponse {
  status: string;
  message: string;
  result: ContractResult[];
}

export interface EVMParameter {
  type: string;
  name?: string;
  components?: EVMParameter[];
}
