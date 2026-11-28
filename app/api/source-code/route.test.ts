import assert from "node:assert/strict";
import test from "node:test";
import axios from "axios";
import { GET } from "./route";
import { getSourceCode, fetchContractAbiRaw } from "../../../utils";

const address = "0x2738d13E81e30bC615766A0410e7cF199FD59A83";
const request = (chainId = "11155111", addr = address) =>
  new Request(
    `https://eth.sh/api/source-code?chainId=${chainId}&address=${addr}`
  );
test("rejects malformed identities before contacting any provider", async (t) => {
  let calls = 0;
  t.mock.method(axios, "get", async () => {
    calls++;
    return { data: missing };
  });
  for (const [chain, addr] of [
    ["1junk", address],
    ["1e3", address],
    ["01", address],
    ["9007199254740992", address],
    ["0", address],
    ["-1", address],
    ["", address],
    ["1", "z".repeat(42)],
    ["1", "0x" + "g".repeat(40)],
    ["1/2", address],
  ]) {
    assert.equal(
      (await GET(request(chain, addr))).status,
      400,
      `${chain}/${addr}`
    );
  }
  assert.equal(calls, 0);
});

const missing = {
  status: "1",
  result: [{ ABI: "Contract source code not verified", SourceCode: "" }],
};
const exact = {
  chainId: "11155111",
  address,
  match: "exact_match",
  runtimeMatch: "exact_match",
  abi: [],
  compilation: { name: "Storage" },
  sources: { "Storage.sol": { content: "contract Storage {}" } },
};

test("source-code GET exposes Sourcify fallback in the existing ABI/source response", async (t) => {
  const urls: string[] = [];
  t.mock.method(axios, "get", async (url: string) => {
    urls.push(url);
    return { data: urls.length === 1 ? missing : exact };
  });
  const response = await GET(request());
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.result[0].ContractName, "Storage");
  assert.equal(body.result[0].ABI, "[]");
  assert.equal(body.result[0].Implementation, "");
  const wrapped = body.result[0].SourceCode;
  assert.deepEqual(JSON.parse(wrapped.slice(1, -1)).sources, exact.sources);
});

test("existing source and raw ABI consumers read fallback metadata without inference", async (t) => {
  t.mock.method(axios, "get", async (url: string) => ({
    data: url.includes("sourcify.dev") ? exact : missing,
  }));
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) =>
    GET(new Request(String(input)))
  );
  assert.deepEqual(await getSourceCode(11155111, address), {
    "Storage.sol": "contract Storage {}",
  });
  assert.deepEqual(await fetchContractAbiRaw({ chainId: 11155111, address }), {
    abi: [],
    name: "Storage",
  });
});

test("Base source lookup accepts Sourcify runtime matches when Etherscan cannot resolve", async (t) => {
  const target = "0x00000000fb2736c301e53904409f03de06c8467a";
  t.mock.method(axios, "get", async (url: string) => {
    if (!url.includes("sourcify.dev"))
      throw Object.assign(new Error("DNS failure"), { code: "ENOTFOUND" });
    return { data: {
      ...exact,
      chainId: "8453",
      address: target,
      match: "match",
      runtimeMatch: "match",
      compilation: { name: "KillSwitch" },
    } };
  });
  const response = await GET(request("8453", target));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.result[0].ContractName, "KillSwitch");
  assert.equal(body.verification.match, "match");
  assert.equal(body.verification.chainId, 8453);
});

test("no-match and unavailable responses expose CORS but no successful ABI result", async (t) => {
  t.mock.method(axios, "get", async () => {
    throw new Error("unavailable");
  });
  const response = await GET(request());
  assert.equal(response.status, 502);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*");
  assert.deepEqual((await response.json()).result, []);
});
