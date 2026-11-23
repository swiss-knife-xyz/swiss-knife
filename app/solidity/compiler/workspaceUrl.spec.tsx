import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { useWorkspaceUrl, parseCompilerImport } from "./useWorkspaceUrl";
const address = `0x${"12".repeat(20)}`;
const identity = { address, chainId: 1 };
afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});
function props(extra: any = {}) {
  return {
    ready: true,
    disabled: false,
    activeId: "normal",
    identity: undefined,
    workspaces: [{ id: "normal", name: "Original" }],
    onSwitch: vi.fn().mockResolvedValue(undefined),
    ...extra,
  };
}
it("opens address-only URLs for chain selection and validates bad parameters", async () => {
  history.replaceState(null, "", `/solidity/compiler?address=${address}`);
  const hook = renderHook(() => useWorkspaceUrl(props()));
  await waitFor(() =>
    expect(hook.result.current.request?.automatic).toBe(false)
  );
  expect(hook.result.current.request?.address).toBe(address);
  expect(hook.result.current.request?.chainId).toBeUndefined();
  expect(parseCompilerImport(`?address=${address}&chainId=oops`)).toMatchObject(
    { automatic: false, error: "Select a valid network." }
  );
  expect(parseCompilerImport("?address=bad&chainId=1")).toMatchObject({
    automatic: false,
    error: "Enter a valid contract address.",
  });
});
it("requests one automatic import once storage is ready, retaining the incoming URL", async () => {
  history.replaceState(
    null,
    "",
    `/solidity/compiler?address=${address}&chainId=1&keep=yes#code`
  );
  const hook = renderHook((p) => useWorkspaceUrl(p), {
    initialProps: props({ ready: false }),
    wrapper: React.StrictMode,
  });
  expect(hook.result.current.request).toBeUndefined();
  hook.rerender(props());
  await waitFor(() =>
    expect(hook.result.current.request?.automatic).toBe(true)
  );
  const id = hook.result.current.request!.id;
  hook.rerender(props());
  expect(hook.result.current.request?.id).toBe(id);
  expect(location.search).toContain(`address=${address}`);
});
it("updates both parameters on switches and preserves unrelated query/hash and history state", async () => {
  history.replaceState(
    { test: "state" },
    "",
    "/solidity/compiler?keep=yes#code"
  );
  const hook = renderHook((p) => useWorkspaceUrl(p), {
    initialProps: props({ activeId: "imported", identity }),
  });
  await waitFor(() => expect(location.search).toContain("chainId=1"));
  hook.rerender(props());
  await waitFor(() => expect(location.search).toBe("?keep=yes"));
  hook.rerender(props({ activeId: "imported", identity }));
  await waitFor(() => expect(location.search).toContain(`address=${address}`));
  expect(location.hash).toBe("#code");
  expect(history.state).toEqual({ test: "state" });
});
it("reopens an existing imported workspace for a matching link instead of importing a duplicate", async () => {
  history.replaceState(
    null,
    "",
    `/solidity/compiler?address=${address}&chainId=1`
  );
  const onSwitch = vi.fn().mockResolvedValue(undefined);
  const workspaces = [
    { id: "imported", name: "Token", importedContract: identity },
  ];
  const hook = renderHook(() =>
    useWorkspaceUrl(props({ workspaces, onSwitch }))
  );
  await waitFor(() => expect(onSwitch).toHaveBeenCalledWith("imported"));
  expect(onSwitch).toHaveBeenCalledTimes(1);
  expect(hook.result.current.request).toBeUndefined();
});
it("does not reimport on reload when the active workspace already matches", async () => {
  history.replaceState(
    null,
    "",
    `/solidity/compiler?address=${address.toUpperCase().replace("0X", "0x")}&chainId=1`
  );
  const onSwitch = vi.fn();
  const hook = renderHook(
    () => useWorkspaceUrl(props({ activeId: "imported", identity, onSwitch })),
    { wrapper: React.StrictMode }
  );
  await waitFor(() => expect(location.search).toContain(`address=${address}`));
  expect(hook.result.current.request).toBeUndefined();
  expect(onSwitch).not.toHaveBeenCalled();
});
it("cancels an incoming link on dismissal and handles a new browser navigation", async () => {
  history.replaceState(null, "", `/solidity/compiler?address=${address}`);
  const hook = renderHook(() => useWorkspaceUrl(props()));
  await waitFor(() => expect(hook.result.current.request).toBeTruthy());
  act(() => hook.result.current.done());
  await waitFor(() => expect(location.search).toBe(""));
  act(() => {
    history.pushState(
      null,
      "",
      `/solidity/compiler?address=${address}&chainId=8453`
    );
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await waitFor(() => expect(hook.result.current.request?.chainId).toBe(8453));
});
