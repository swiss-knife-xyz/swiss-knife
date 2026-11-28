import { afterEach, expect, it } from "vitest";
import {
  beginCustomRpcRequest,
  clearCustomRpcFailure,
  getCustomRpcFailures,
  settleCustomRpcRequest,
} from "./failures";
const chainId = 8453;
const url = "http://127.0.0.1:8545/private-key";
afterEach(() => clearCustomRpcFailure(chainId));
it("reports nested connection failures and clears them when the endpoint responds", () => {
  settleCustomRpcRequest(chainId, url, beginCustomRpcRequest(), {
    cause: { name: "HttpRequestError", message: "Failed to fetch" },
  });
  expect(getCustomRpcFailures()).toEqual([
    { chainId, rpcUrl: url, reason: "unreachable" },
  ]);
  settleCustomRpcRequest(chainId, url, beginCustomRpcRequest());
  expect(getCustomRpcFailures()).toEqual([]);
});
it.each([
  [{ cause: { status: 401 } }, "access"],
  [{ status: 429 }, "rate-limit"],
  [{ name: "TimeoutError" }, "unreachable"],
])("distinguishes provider failures (%j)", (error, reason) => {
  settleCustomRpcRequest(chainId, url, beginCustomRpcRequest(), error);
  expect(getCustomRpcFailures()[0]?.reason).toBe(reason);
});
it.each([
  { code: 3, message: "execution reverted" },
  { code: -32601, message: "Method not found" },
  { name: "HttpRequestError", status: 400 },
])(
  "does not treat a contract or method error as an offline RPC (%j)",
  (error) => {
    settleCustomRpcRequest(chainId, url, beginCustomRpcRequest(), error);
    expect(getCustomRpcFailures()).toEqual([]);
  }
);
it("ignores late requests after a newer recovery or explicit reset", () => {
  const old = beginCustomRpcRequest();
  settleCustomRpcRequest(chainId, url, beginCustomRpcRequest());
  settleCustomRpcRequest(chainId, url, old, { name: "TimeoutError" });
  expect(getCustomRpcFailures()).toEqual([]);
  const pending = beginCustomRpcRequest();
  clearCustomRpcFailure(chainId);
  settleCustomRpcRequest(chainId, url, pending, { name: "TimeoutError" });
  expect(getCustomRpcFailures()).toEqual([]);
});
