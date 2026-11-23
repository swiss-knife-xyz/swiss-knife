"use client";

import { useSyncExternalStore } from "react";
import { customChainStorage } from "./storage";
import { parseCustomChains, type CustomChain } from "./model";
import { applyCustomNetworks } from "@/data/networks";

type Snapshot = {
  chains: readonly CustomChain[];
  ready: boolean;
  error: string | null;
  revision: number;
};
const initial: Snapshot = {
  chains: [],
  ready: false,
  error: null,
  revision: 0,
};
let snapshot = initial;
const listeners = new Set<() => void>();
let initialized: Promise<void> | null = null;
let loadSequence = 0;
let subscribed = false;
function publish(entries: CustomChain[], error: string | null = null) {
  const changed = JSON.stringify(entries) !== JSON.stringify(snapshot.chains);
  if (changed) applyCustomNetworks(entries);
  snapshot = {
    chains: entries,
    ready: true,
    error,
    revision: snapshot.revision + Number(changed),
  };
  listeners.forEach((listener) => listener());
}
export const subscribeCustomChains = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const getCustomChainsSnapshot = () => snapshot;
export const getSavedCustomChain = (id: number) =>
  snapshot.chains.find((chain) => chain.id === id);
export function useCustomChains() {
  return useSyncExternalStore(
    subscribeCustomChains,
    getCustomChainsSnapshot,
    () => initial
  );
}
export function initializeCustomChains(): Promise<void> {
  if (initialized) return initialized;
  if (!subscribed) {
    subscribed = true;
    customChainStorage.subscribe(() => {
      void reloadCustomChains();
    });
  }
  initialized = reloadCustomChains();
  return initialized;
}
export async function reloadCustomChains() {
  const sequence = ++loadSequence;
  try {
    const entries = await customChainStorage.request("GET_ALL");
    if (sequence === loadSequence) publish(entries);
  } catch (error) {
    if (sequence === loadSequence) {
      publish(
        [...snapshot.chains],
        error instanceof Error ? error.message : "Unable to load saved chains."
      );
      initialized = null;
    }
  }
}
export async function saveCustomChain(entry: CustomChain) {
  const entries = await customChainStorage.request("UPSERT", entry);
  ++loadSequence;
  publish(parseCustomChains(entries));
}
export async function removeCustomChain(id: number) {
  const entries = await customChainStorage.request("REMOVE", id);
  ++loadSequence;
  publish(parseCustomChains(entries));
}

export async function waitForCustomChains() {
  await initializeCustomChains();
  if (snapshot.error) throw new Error(snapshot.error);
}
