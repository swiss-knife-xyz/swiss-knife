import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { TraceTree } from "./TraceTree";
import { TraceTool } from "./TraceTool";
import { normalizeCallTrace, TRACE_EXAMPLE } from "@/lib/trace/model";
import fixture from "@/lib/trace/fixtures/ethereum-execute.json";
import { CalldataTree } from "@/app/calldata/decoder/components/CalldataTree";
vi.mock("@/components/decodedParams", () => ({
  AddressParam: ({ address }: any) => <span>{address}</span>,
  IntParam: ({ value }: any) => <span>{value}</span>,
  UintParam: ({ value }: any) => <span>{value}</span>,
  StringParam: ({ value }: any) => <span>{value}</span>,
}));
vi.mock("@/components/decodedParams/TreeView/TreeBytesParam", () => ({
  TreeBytesParam: ({ arg }: any) => <span>{arg.rawValue}</span>,
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const root = normalizeCallTrace(fixture.result);
function mount(ui: React.ReactNode) {
  return render(<ChakraProvider>{ui}</ChakraProvider>);
}
describe("executed call tree", () => {
  it("renders every actual frame, nested failed calls and selector labels distinctly", () => {
    const { container } = mount(<TraceTree root={root} />);
    expect(container.querySelectorAll("[data-trace-frame]").length).toBe(6);
    const parent = container.querySelector('[data-trace-frame="0.0"]')!;
    expect(parent.querySelectorAll("[data-trace-frame]").length).toBe(4);
    expect(screen.getAllByText("execution reverted").length).toBe(2);
    expect(screen.getAllByText(/transfer\(address,uint256\)/).length).toBe(2);
    expect(
      screen.getAllByText(/selector match, not verified ABI/).length
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("0xa9059cbb").length).toBe(2);
    expect(screen.getAllByText(fixture.result.from).length).toBeGreaterThan(0);
  });
  it("collapses all, supports keyboard branches, and preserves child disclosure/raw state", () => {
    const { container } = mount(<TraceTree root={root} />);
    fireEvent.click(screen.getByRole("button", { name: "Collapse all" }));
    const top = screen.getByRole("button", { name: /^CALL frame 0$/ });
    expect(top.getAttribute("aria-expanded")).toBe("false");
    fireEvent.keyDown(top, { key: "Enter" });
    expect(top.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Expand all" }));
    const frame = container.querySelector(
      '[data-trace-frame="0.0.1"]'
    ) as HTMLElement;
    fireEvent.click(
      within(frame).getAllByRole("button", { name: "Raw data" })[0]
    );
    const raw = within(frame).getAllByText(
      root.children[0].children[1].input
    )[0];
    expect(raw).toBeTruthy();
    fireEvent.click(top);
    fireEvent.click(top);
    expect(raw.isConnected).toBe(true);
    fireEvent.keyDown(top, { key: " " });
    expect(top.getAttribute("aria-expanded")).toBe("false");
  });
});
describe("trace input", () => {
  it("requests only on submit and clears stale results/errors when inputs change", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        chainId: 1,
        hash: TRACE_EXAMPLE,
        blockNumber: "26448579",
        blockHash: fixture.provenance.blockHash,
        status: "success",
        provider: "dRPC",
        method: "debug_traceTransaction / callTracer",
        fetchedAt: "2026-11-19T18:00:00Z",
        root,
      })
    );
    mount(<TraceTool />);
    expect(fetcher).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Confirmed transaction hash"), {
      target: { value: TRACE_EXAMPLE },
    });
    fireEvent.click(screen.getByRole("button", { name: "Trace transaction" }));
    await screen.findByText("Executed call frames");
    expect(fetcher.mock.calls[0][0]).toBe(
      `/api/trace?chain=1&hash=${TRACE_EXAMPLE}`
    );
    fireEvent.change(screen.getByLabelText("Confirmed transaction hash"), {
      target: { value: "bad" },
    });
    expect(screen.queryByText("Executed call frames")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Trace transaction" }));
    await screen.findByRole("alert");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("shows explicit provider errors and ignores stale responses after editing", async () => {
    let resolve!: (response: Response) => void;
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        })
    );
    mount(<TraceTool />);
    fireEvent.change(screen.getByLabelText("Confirmed transaction hash"), {
      target: { value: TRACE_EXAMPLE },
    });
    fireEvent.click(screen.getByRole("button", { name: "Trace transaction" }));
    fireEvent.change(screen.getByLabelText("Confirmed transaction hash"), {
      target: { value: "0x" + "11".repeat(32) },
    });
    resolve(
      Response.json(
        { error: { code: "PRUNED", message: "Historical state is pruned." } },
        { status: 502 }
      )
    );
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: "Wait a minute before retrying.",
          },
        },
        { status: 429 }
      )
    );
    fireEvent.click(screen.getByRole("button", { name: "Trace transaction" }));
    await screen.findByText(/RATE_LIMITED/);
    expect(screen.queryByText("Executed call frames")).toBeNull();
  });
});
describe("decoder regression using the shared tree header", () => {
  it("retains calldata parameters, raw bytes and collapse/expand semantics", () => {
    mount(
      <CalldataTree
        functionName="example"
        args={[
          {
            name: "values",
            type: "uint256[]",
            baseType: "array",
            value: [
              { name: "", type: "uint256", baseType: "uint256", value: "42" },
            ],
          } as any,
        ]}
      />
    );
    expect(screen.getByText("42")).toBeTruthy();
    const branch = screen.getByRole("button", { name: "values" });
    fireEvent.keyDown(branch, { key: "Enter" });
    expect(branch.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "Collapse all" }));
    expect(
      screen
        .getByRole("button", { name: "example" })
        .getAttribute("aria-expanded")
    ).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "Expand all" }));
    expect(branch.getAttribute("aria-expanded")).toBe("true");
  });
});
