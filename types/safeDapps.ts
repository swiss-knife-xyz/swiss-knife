export interface SafeDappInfo {
  id: number;
  name: string;
  description: string;
  url: string;
  iconUrl: string;
  chains: number[];
}

export interface CustomDappConfig {
  disabled: string[]; // Array of dapp IDs or names to disable
  custom: SafeDappInfo[]; // Array of custom dapps to add
}
