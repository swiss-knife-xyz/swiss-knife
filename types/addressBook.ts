export interface SavedAddressInfo {
  address: string; // Checksummed address
  label: string; // User-defined label
  createdAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp
}

export interface AddressBookState {
  addresses: SavedAddressInfo[];
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
}

// Message types for postMessage protocol
export type StorageAction = "GET_ALL" | "ADD" | "REMOVE" | "UPDATE";

export interface StorageRequest {
  id: string; // Unique request ID for matching responses
  action: StorageAction;
  payload?: any;
}

export interface StorageResponse {
  id: string;
  success: boolean;
  data?: SavedAddressInfo[];
  error?: string;
}
