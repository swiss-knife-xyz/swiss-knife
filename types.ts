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
  forContracts?: boolean;
}

export enum ExplorerType {
  ADDRESS,
  TX,
}
