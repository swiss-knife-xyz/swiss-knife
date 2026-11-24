vi.mock("@/hooks/useAddressBook", () => ({
  useAddressBook: () => ({ openSelector: vi.fn() }),
}));
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { ImportVerifiedContract } from "./ImportVerifiedContract";
import {
  verifiedContractBackup,
  verifiedContractWorkspace,
  type VerifiedContract,
} from "@/lib/solidity/verifiedContract";
import { fetchVerifiedContract } from "@/lib/solidity/verifiedContractServer";
import { standardJsonInput } from "@/lib/solidity/settings";
import { compilationSources } from "@/lib/solidity/compilation";

vi.mock("@/components/NetworkSelect", () => ({
  NetworkSelect: ({ chainId, onChange }: any) => (
    <select
      aria-label="Verified contract network"
      value={chainId}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      <option value={1}>Ethereum</option>
      <option value={8453}>Base</option>
    </select>
  ),
}));
const address = `0x${"12".repeat(20)}`;
const input = {
  language: "Solidity",
  sources: {
    "deps/Base.sol": { content: "pragma solidity ^0.8.20; contract Base {}" },
    "src/Token.sol": {
      content:
        'pragma solidity ^0.8.20; import {Base} from "@base/Base.sol"; contract Token is Base {}',
    },
  },
  settings: {
    optimizer: { enabled: true, runs: 500, details: { peephole: true } },
    viaIR: true,
    evmVersion: "cancun",
    metadata: { bytecodeHash: "none" },
    remappings: ["@base/=deps/"],
  },
};
const data: VerifiedContract = {
  chainId: 1,
  address,
  provider: "etherscan",
  source: {
    sourceCode: JSON.stringify(input),
    contractName: "src/Token.sol:Token",
    compilerVersion: "v0.8.30+commit.73712a01",
    constructorArguments: "",
    licenseType: "3",
    files: Object.keys(input.sources),
    partial: false,
  },
};
beforeEach(() => {
  Element.prototype.scrollTo = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it("retains the verified entry, exact version, every source and advanced settings through workspace creation", () => {
  const backup = verifiedContractBackup(data.source);
  expect(backup.activeFile).toBe("src/Token.sol");
  expect(backup.compilerSettings?.version).toBe(
    "soljson-v0.8.30+commit.73712a01.js"
  );
  const workspace = verifiedContractWorkspace(data.source);
  expect(
    workspace.files.find((file) => file.id === workspace.activeFileId)?.name
  ).toBe("src/Token.sol");
  const settings = workspace.compilerSettings!;
  expect(standardJsonInput({}, settings).settings).toMatchObject(
    input.settings
  );
  expect(
    Object.keys(
      compilationSources(
        workspace.files,
        "src/Token.sol",
        settings.extras?.remappings
      )
    )
  ).toHaveLength(2);
});
it("rejects unsupported versions, unsafe paths and missing entries before creating anything", () => {
  expect(() =>
    verifiedContractBackup({
      ...data.source,
      compilerVersion: "v0.4.26+commit.4563c3fc",
    })
  ).toThrow(/0.5.0/);
  expect(() =>
    verifiedContractBackup({
      ...data.source,
      contractName: "Missing.sol:Token",
    })
  ).toThrow(/entry file/);
  expect(() =>
    verifiedContractBackup({
      ...data.source,
      sourceCode: JSON.stringify({
        ...input,
        sources: { "../Bad.sol": { content: "contract Bad {}" } },
      }),
    })
  ).toThrow();
});
const raw = () => ({
  status: "1",
  result: [
    {
      SourceCode: `{${data.source.sourceCode}}`,
      ContractName: "Token",
      ContractFileName: "src/Token.sol",
      CompilerVersion: data.source.compilerVersion,
      ConstructorArguments: "",
      LicenseType: "MIT",
    },
  ],
});
it("reuses explorer normalization without following an implementation or fetching import URLs", async () => {
  const payload = raw();
  Object.assign(payload.result[0], { Implementation: `0x${"ab".repeat(20)}` });
  const fetcher = vi.fn().mockResolvedValue(Response.json(payload));
  const result = await fetchVerifiedContract(
    "1",
    address,
    new AbortController().signal,
    { etherscan: "private-key" },
    fetcher
  );
  expect(result.source.contractName).toBe(data.source.contractName);
  expect(result.source.implementationAddress).toBe(`0x${"ab".repeat(20)}`);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(new URL(fetcher.mock.calls[0][0]).hostname).toBe("api.etherscan.io");
  expect(JSON.stringify(result)).not.toContain("private-key");
});
it("falls back from an unavailable explorer to Sourcify while retaining its exact compiler", async () => {
  const fetcher = vi.fn(async (url: Parameters<typeof fetch>[0]) =>
    String(url).includes("api.etherscan.io")
      ? Response.json({
          status: "0",
          message: "NOTOK",
          result: "Invalid API Key",
        })
      : Response.json({
          match: "exact_match",
          sources: input.sources,
          compilation: {
            compiler: "solc",
            language: "Solidity",
            fullyQualifiedName: "src/Token.sol:Token",
            compilerVersion: data.source.compilerVersion,
            compilerSettings: input.settings,
          },
          metadata: {},
        })
  );
  const result = await fetchVerifiedContract(
    "1",
    address,
    new AbortController().signal,
    { etherscan: "invalid-key" },
    fetcher
  );
  expect(result.provider).toBe("sourcify");
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("validates network/address before contacting a provider and respects cancellation", async () => {
  const fetcher = vi.fn();
  await expect(
    fetchVerifiedContract(
      "999999999999",
      address,
      new AbortController().signal,
      {},
      fetcher
    )
  ).rejects.toThrow();
  await expect(
    fetchVerifiedContract(
      "1",
      "https://attacker.test",
      new AbortController().signal,
      {},
      fetcher
    )
  ).rejects.toThrow();
  const controller = new AbortController();
  controller.abort();
  await expect(
    fetchVerifiedContract("1", address, controller.signal, {}, fetcher)
  ).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});
async function open(create = vi.fn().mockResolvedValue(undefined)) {
  render(
    <ChakraProvider>
      <ImportVerifiedContract
        disabled={false}
        workspaceNames={["Original", "Token"]}
        onCreate={create}
        onOpen={() => {}}
      />
    </ChakraProvider>
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Import verified contract" })
  );
  return create;
}
it("reviews the fetched sources, then creates a uniquely named workspace with verified settings", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(data)));
  const create = await open();
  fireEvent.change(screen.getByLabelText("Verified contract address"), {
    target: { value: `https://etherscan.io/address/${address}#code` },
  });
  fireEvent.click(screen.getByText("Fetch source"));
  await screen.findByText("solc 0.8.30", { exact: false });
  expect(create).not.toHaveBeenCalled();
  expect(
    (
      screen.getByLabelText(
        "Verified contract workspace name"
      ) as HTMLInputElement
    ).value
  ).toBe("Token 2");
  fireEvent.click(screen.getByText("Create workspace"));
  await waitFor(() => expect(create).toHaveBeenCalledOnce());
  expect(create.mock.calls[0][0]).toBe("Token 2");
  expect(create.mock.calls[0][1].compilerSettings.runs).toBe(500);
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});
it("extracts explorer links and ignores late results after closing", async () => {
  let resolve!: (value: Response) => void;
  const fetcher = vi.fn(
    (_url: string, _init?: RequestInit) =>
      new Promise<Response>((done) => {
        resolve = done;
      })
  );
  vi.stubGlobal("fetch", fetcher);
  const create = await open();
  fireEvent.paste(screen.getByLabelText("Verified contract address"), {
    clipboardData: {
      getData: () => `https://basescan.org/address/${address}#code`,
    },
  });
  expect(
    (screen.getByLabelText("Verified contract network") as HTMLSelectElement)
      .value
  ).toBe("8453");
  fireEvent.click(screen.getByText("Fetch source"));
  expect(fetcher.mock.calls[0][0]).toContain("chainId=8453");
  fireEvent.click(screen.getByText("Cancel"));
  resolve(Response.json({ ...data, chainId: 8453 }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(create).not.toHaveBeenCalled();
});
it("keeps storage errors visible and allows retry without another source fetch", async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json(data));
  vi.stubGlobal("fetch", fetcher);
  const create = vi
    .fn()
    .mockRejectedValueOnce(new Error("Storage unavailable"))
    .mockResolvedValue(undefined);
  await open(create);
  fireEvent.change(screen.getByLabelText("Verified contract address"), {
    target: { value: address },
  });
  fireEvent.click(screen.getByText("Fetch source"));
  fireEvent.click(await screen.findByText("Create workspace"));
  await screen.findByText("Storage unavailable");
  fireEvent.click(screen.getByText("Create workspace"));
  await waitFor(() => expect(create).toHaveBeenCalledTimes(2));
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("automatically creates exactly one workspace from an address and chain URL request under effect replay", async () => {
  const fetcher = vi
    .fn()
    .mockImplementation(() => Promise.resolve(Response.json(data)));
  vi.stubGlobal("fetch", fetcher);
  const create = vi.fn().mockResolvedValue(undefined),
    done = vi.fn();
  render(
    <React.StrictMode>
      <ChakraProvider>
        <ImportVerifiedContract
          disabled={false}
          workspaceNames={[]}
          onCreate={create}
          onOpen={() => {}}
          request={{
            id: 1,
            address: data.address,
            chainId: 1,
            automatic: true,
          }}
          onRequestDone={done}
        />
      </ChakraProvider>
    </React.StrictMode>
  );
  await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
  expect(create.mock.calls[0][0]).toBe("Token");
  expect(create.mock.calls[0][2]).toMatchObject({
    address: data.address,
    chainId: 1,
  });
  expect(done).toHaveBeenCalledOnce();
});
it("prefills an address-only URL without fetching until the user chooses to continue", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  render(
    <ChakraProvider>
      <ImportVerifiedContract
        disabled={false}
        workspaceNames={[]}
        onCreate={vi.fn()}
        onOpen={() => {}}
        request={{ id: 2, address: data.address, automatic: false }}
      />
    </ChakraProvider>
  );
  await screen.findByRole("dialog");
  expect(
    (screen.getByLabelText("Verified contract address") as HTMLInputElement)
      .value
  ).toBe(data.address);
  expect(fetcher).not.toHaveBeenCalled();
});
