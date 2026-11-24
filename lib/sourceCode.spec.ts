import { afterEach, expect, it, vi } from "vitest";
import { getSourceCode, getSourceCodeWithMetadata } from "@/utils";
afterEach(() => vi.unstubAllGlobals());
it("retains verified contract names for multi-file sources and preserves the plain source helper", async () => {
  const sourceCode = { "src/Token.sol": { content: "contract Token {}" }, "src/Base.sol": { content: "contract Base {}" } };
  const fetcher = vi.fn(async () => Response.json({ result: [{ ContractName: "Token", SourceCode: `{${JSON.stringify({ sources: sourceCode })}}` }] }));
  vi.stubGlobal("fetch", fetcher);
  const result = await getSourceCodeWithMetadata(1, "0x0000000000000000000000000000000000000001");
  expect(result).toEqual({ contractName: "Token", sourceCode: { "src/Token.sol": "contract Token {}", "src/Base.sol": "contract Base {}" } });
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(await getSourceCode(1, "0x0000000000000000000000000000000000000001")).toEqual(result!.sourceCode);
});
it("retains the verified name for single-file contracts", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ result: [{ ContractName: "WETH9", SourceCode: "contract WETH9 {}" }] })));
  expect(await getSourceCodeWithMetadata(1, "0x0000000000000000000000000000000000000001")).toEqual({ contractName: "WETH9", sourceCode: { WETH9: "contract WETH9 {}" } });
});
