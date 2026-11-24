"use client";
import { useEffect, useRef, useState } from "react";
import type {
  ImportedContractIdentity,
  WorkspaceSummary,
} from "@/lib/solidity/workspace";
export type ContractImportRequest = {
  id: number;
  address: string;
  chainId?: number;
  automatic: boolean;
  error?: string;
};
export function parseCompilerImport(
  search: string
): Omit<ContractImportRequest, "id"> | null {
  const params = new URLSearchParams(search);
  const address = params.get("address");
  if (!address) return null;
  const rawChain = params.get("chainId");
  const chainId =
    rawChain &&
    /^[1-9]\d*$/.test(rawChain) &&
    Number.isSafeInteger(Number(rawChain))
      ? Number(rawChain)
      : undefined;
  const error = !/^0x[0-9a-fA-F]{40}$/.test(address)
    ? "Enter a valid contract address."
    : rawChain !== null && !chainId
      ? "Select a valid network."
      : undefined;
  return {
    address,
    chainId,
    automatic: !!chainId && !error,
    ...(error ? { error } : {}),
  };
}
export function syncCompilerWorkspaceUrl(identity?: ImportedContractIdentity) {
  const url = new URL(window.location.href);
  if (identity) {
    url.searchParams.set("address", identity.address);
    url.searchParams.set("chainId", String(identity.chainId));
  } else {
    url.searchParams.delete("address");
    url.searchParams.delete("chainId");
  }
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (next !== `${location.pathname}${location.search}${location.hash}`)
    window.history.replaceState(window.history.state, "", next);
}
const matches = (
  a: ImportedContractIdentity | undefined,
  b: { address: string; chainId?: number }
) =>
  !!a &&
  a.chainId === b.chainId &&
  a.address.toLowerCase() === b.address.toLowerCase();

/** Consume incoming links once; subsequent workspace changes own these two params. */
export function useWorkspaceUrl({
  ready,
  disabled,
  activeId,
  identity,
  workspaces,
  onSwitch,
}: {
  ready: boolean;
  disabled: boolean;
  activeId?: string;
  identity?: ImportedContractIdentity;
  workspaces: WorkspaceSummary[];
  onSwitch(id: string): Promise<void>;
}) {
  const [request, setRequest] = useState<ContractImportRequest>();
  const [incoming, setIncoming] = useState<
    ContractImportRequest | null | undefined
  >();
  const sequence = useRef(0);
  const latestIncoming = useRef(incoming);
  latestIncoming.current = incoming;
  const switching = useRef<number | undefined>(undefined);
  const callbacks = useRef({ onSwitch });
  callbacks.current = { onSwitch };
  useEffect(() => {
    const read = () => {
      const parsed = parseCompilerImport(window.location.search);
      switching.current = undefined;
      setRequest(undefined);
      setIncoming(parsed ? { ...parsed, id: ++sequence.current } : null);
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);
  useEffect(() => {
    if (!ready || disabled || incoming === undefined) return;
    if (incoming) {
      if (matches(identity, incoming)) {
        setIncoming(null);
        setRequest(undefined);
        return;
      }
      const existing =
        incoming.automatic &&
        workspaces.find((workspace) =>
          matches(workspace.importedContract, incoming)
        );
      if (existing && existing.id !== activeId) {
        if (switching.current === incoming.id) return;
        switching.current = incoming.id;
        void callbacks.current
          .onSwitch(existing.id)
          .then(() => {
            // The adopted workspace's identity drives the next URL sync.
            setIncoming((current) =>
              current?.id === incoming.id ? null : current
            );
          })
          .catch((error) => {
            if (latestIncoming.current?.id !== incoming.id) return;
            setRequest({
              ...incoming,
              automatic: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Couldn't switch workspace.",
            });
          });
        return;
      }
      setRequest((current) =>
        current?.id === incoming.id ? current : incoming
      );
      return;
    }
    syncCompilerWorkspaceUrl(identity);
  }, [
    ready,
    disabled,
    activeId,
    identity?.address,
    identity?.chainId,
    workspaces,
    incoming,
  ]);
  const done = (id?: number) => {
    setIncoming((current) =>
      id !== undefined && current?.id !== id ? current : null
    );
    setRequest((current) =>
      id !== undefined && current?.id !== id ? current : undefined
    );
  };
  return { request, done };
}
