"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  useMemo,
} from "react";
import { getAddress, isAddress } from "viem";
import { getStorageHub } from "@/lib/addressBook/storageHub";
import type { SavedAddressInfo, AddressBookState } from "@/types/addressBook";
import { slicedText } from "@/utils";

// Data context: addresses, CRUD, labels, drawer, openSelector (stable callback)
interface AddressBookDataContextValue extends AddressBookState {
  // CRUD operations
  addAddress: (address: string, label: string) => Promise<void>;
  removeAddress: (address: string) => Promise<void>;
  updateAddress: (address: string, label: string) => Promise<void>;

  // Lookup utilities
  getLabel: (address: string) => string | null;
  getLabelOrSliced: (address: string) => string;

  // UI state
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;

  // Selector trigger (stable callback — does not change when selector opens)
  openSelector: (onSelect: (address: string) => void) => void;
}

// Selector UI context: only consumed by AddressBookSelector modal
export interface AddressBookSelectorContextValue {
  isSelectorOpen: boolean;
  closeSelector: () => void;
  onAddressSelect: ((address: string) => void) | null;
  addresses: SavedAddressInfo[];
  isLoading: boolean;
}

const AddressBookDataContext =
  createContext<AddressBookDataContextValue | null>(null);
const AddressBookSelectorContext =
  createContext<AddressBookSelectorContextValue | null>(null);

export function AddressBookProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<AddressBookState>({
    addresses: [],
    isLoading: true,
    isReady: false,
    error: null,
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [onAddressSelect, setOnAddressSelect] = useState<
    ((address: string) => void) | null
  >(null);

  // Initialize storage hub and load addresses
  useEffect(() => {
    const init = async () => {
      try {
        const hub = getStorageHub();
        await hub.initialize();
        const addresses = await hub.getAll();
        setState({
          addresses,
          isLoading: false,
          isReady: true,
          error: null,
        });
      } catch (error) {
        console.error("Failed to initialize address book:", error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isReady: true,
          error:
            error instanceof Error ? error.message : "Failed to load addresses",
        }));
      }
    };
    init();
  }, []);

  // Normalize address to checksummed format
  const normalizeAddress = useCallback((address: string): string => {
    if (isAddress(address)) {
      return getAddress(address);
    }
    return address;
  }, []);

  const addAddress = useCallback(
    async (address: string, label: string) => {
      const normalized = normalizeAddress(address);
      const now = Date.now();
      const newAddress: SavedAddressInfo = {
        address: normalized,
        label,
        createdAt: now,
        updatedAt: now,
      };

      try {
        const hub = getStorageHub();
        const addresses = await hub.add(newAddress);
        setState((prev) => ({ ...prev, addresses }));
      } catch (error) {
        console.error("Failed to add address:", error);
        throw error;
      }
    },
    [normalizeAddress]
  );

  const removeAddress = useCallback(async (address: string) => {
    try {
      const hub = getStorageHub();
      const addresses = await hub.remove(address);
      setState((prev) => ({ ...prev, addresses }));
    } catch (error) {
      console.error("Failed to remove address:", error);
      throw error;
    }
  }, []);

  const updateAddress = useCallback(async (address: string, label: string) => {
    try {
      const hub = getStorageHub();
      const addresses = await hub.update(address, label);
      setState((prev) => ({ ...prev, addresses }));
    } catch (error) {
      console.error("Failed to update address:", error);
      throw error;
    }
  }, []);

  // Create lookup map for O(1) access
  const addressLookup = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of state.addresses) {
      map.set(item.address.toLowerCase(), item.label);
    }
    return map;
  }, [state.addresses]);

  const getLabel = useCallback(
    (address: string): string | null => {
      if (!address) return null;
      return addressLookup.get(address.toLowerCase()) || null;
    },
    [addressLookup]
  );

  const getLabelOrSliced = useCallback(
    (address: string): string => {
      const label = getLabel(address);
      if (label) return label;
      return slicedText(address);
    },
    [getLabel]
  );

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  const openSelector = useCallback((onSelect: (address: string) => void) => {
    setOnAddressSelect(() => onSelect);
    setIsSelectorOpen(true);
  }, []);

  const closeSelector = useCallback(() => {
    setIsSelectorOpen(false);
    setOnAddressSelect(null);
  }, []);

  // Memoize data context — only changes when addresses/drawer state changes,
  // NOT when selector opens/closes
  const dataValue = useMemo<AddressBookDataContextValue>(
    () => ({
      ...state,
      addAddress,
      removeAddress,
      updateAddress,
      getLabel,
      getLabelOrSliced,
      isDrawerOpen,
      openDrawer,
      closeDrawer,
      openSelector,
    }),
    [
      state,
      addAddress,
      removeAddress,
      updateAddress,
      getLabel,
      getLabelOrSliced,
      isDrawerOpen,
      openDrawer,
      closeDrawer,
      openSelector,
    ]
  );

  // Memoize selector context — only consumed by AddressBookSelector
  const selectorValue = useMemo<AddressBookSelectorContextValue>(
    () => ({
      isSelectorOpen,
      closeSelector,
      onAddressSelect,
      addresses: state.addresses,
      isLoading: state.isLoading,
    }),
    [
      isSelectorOpen,
      closeSelector,
      onAddressSelect,
      state.addresses,
      state.isLoading,
    ]
  );

  return (
    <AddressBookDataContext.Provider value={dataValue}>
      <AddressBookSelectorContext.Provider value={selectorValue}>
        {children}
      </AddressBookSelectorContext.Provider>
    </AddressBookDataContext.Provider>
  );
}

export function useAddressBookContext(): AddressBookDataContextValue {
  const context = useContext(AddressBookDataContext);
  if (!context) {
    throw new Error(
      "useAddressBookContext must be used within AddressBookProvider"
    );
  }
  return context;
}

export function useAddressBookSelectorContext(): AddressBookSelectorContextValue {
  const context = useContext(AddressBookSelectorContext);
  if (!context) {
    throw new Error(
      "useAddressBookSelectorContext must be used within AddressBookProvider"
    );
  }
  return context;
}
