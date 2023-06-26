import { SingleValue } from "chakra-react-select";

export interface SelectedOption {
  label: string;
  value: number | string;
}

export type SelectedOptionState = SingleValue<SelectedOption>;
