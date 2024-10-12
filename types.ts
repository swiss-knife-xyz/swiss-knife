import { SingleValue } from "chakra-react-select";

export interface SelectedOption {
  label: string;
  value: number | string;
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

export type DecodeParamTypesResult =
  | string
  | DecodeBytesParamResult
  | DecodeTupleParamResult
  | DecodeArrayParamResult;

export type DecodeRecursiveResult = {
  functionName: string;
  signature: string;
  rawArgs: any;
  args: {
    name: string;
    baseType: string;
    type: string;
    rawValue: any;
    value: DecodeParamTypesResult;
  }[];
} | null;
