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
