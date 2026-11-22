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
import { ContractAbiEditor } from "./ContractAbiEditor";
import { parseContractAbi } from "@/lib/contractAbi";

const { fetchAbi } = vi.hoisted(() => ({ fetchAbi: vi.fn() }));
vi.mock("@monaco-editor/react", () => ({
  Editor: ({ value, onChange, options, defaultLanguage }: any) => <textarea aria-label={options.ariaLabel} data-language={defaultLanguage} readOnly={options.readOnly} value={value} onChange={event => onChange?.(event.target.value)} />,
}));
vi.mock("@/utils", () => ({ fetchContractAbi: fetchAbi }));
vi.mock("@/components/DarkSelect", () => ({
  DarkSelect: ({
    ariaLabel,
    selectedOption,
    setSelectedOption,
    options,
  }: any) => (
    <select
      aria-label={ariaLabel}
      value={selectedOption?.value ?? ""}
      onChange={(e) =>
        setSelectedOption(
          options.find(
            (option: any) => String(option.value) === e.target.value
          ) ?? null
        )
      }
    >
      {options.map((option: any) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));
const original = parseContractAbi("function original() view returns (bool)");
const apply = vi.fn();
const reset = vi.fn();
function page(isCustom = false) {
  return (
    <ChakraProvider>
      <ContractAbiEditor
        abi={original}
        chainId={1}
        isCustom={isCustom}
        onApply={apply}
        onReset={reset}
      />
    </ChakraProvider>
  );
}
async function open() {
  fireEvent.click(screen.getByRole("button", { name: "Modify ABI" }));
  await screen.findByRole("dialog");
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addListener() {},
    removeListener() {},
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("validates replacements without changing the active ABI until Apply", async () => {
  render(page());
  await open();
  fireEvent.click(screen.getByRole("tab", { name: "ABI" }));
  const input = screen.getByRole("textbox", { name: "ABI" });
  fireEvent.change(input, { target: { value: "not valid" } });
  fireEvent.click(screen.getByRole("button", { name: "Apply ABI" }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(apply).not.toHaveBeenCalled();
  fireEvent.change(input, {
    target: { value: '["function replacement(uint256 value)"]' },
  });
  fireEvent.click(screen.getByRole("button", { name: "Apply ABI" }));
  expect(apply).toHaveBeenCalledWith(
    expect.arrayContaining([expect.objectContaining({ name: "replacement" })]),
    false
  );
});
it("adds human-readable functions without replacing the ABI", async () => {
  render(page());
  await open();
  fireEvent.click(screen.getByText("Add functions", { exact: true }));
  fireEvent.change(
    screen.getByRole("textbox", { name: "Function declarations" }),
    { target: { value: "function hello(uint256) returns (address)" } }
  );
  fireEvent.click(screen.getByRole("button", { name: "Apply ABI" }));
  expect(apply).toHaveBeenCalledWith(
    expect.arrayContaining([
      expect.objectContaining({
        name: "hello",
        outputs: [expect.objectContaining({ type: "address" })],
      }),
    ]),
    true
  );
});
it("imports from an explorer URL on its own network and supports merge mode", async () => {
  fetchAbi.mockResolvedValue({ abi: original, name: "Other contract" });
  render(page());
  await open();
  fireEvent.click(screen.getByText("From contract", { exact: true }));
  fireEvent.change(screen.getByRole("textbox", { name: "Source contract" }), {
    target: {
      value:
        "https://basescan.org/address/0x0000000000000000000000000000000000000002#code",
    },
  });
  fireEvent.change(screen.getByRole("combobox", { name: "Import mode" }), {
    target: { value: "merge" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Import ABI" }));
  await waitFor(() => expect(apply).toHaveBeenCalledWith(original, true));
  expect(fetchAbi).toHaveBeenCalledExactlyOnceWith({
    address: "0x0000000000000000000000000000000000000002",
    chainId: 8453,
  });
});
it("keeps fetch failures visible and cancels an import when the modal closes", async () => {
  fetchAbi.mockRejectedValueOnce(new Error("Contract is not verified"));
  render(page());
  await open();
  fireEvent.click(screen.getByText("From contract", { exact: true }));
  fireEvent.change(screen.getByRole("textbox", { name: "Source contract" }), {
    target: { value: "0x0000000000000000000000000000000000000002" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Import ABI" }));
  expect(await screen.findByText("Contract is not verified")).toBeTruthy();
  expect(apply).not.toHaveBeenCalled();
  let resolve!: (value: any) => void;
  fetchAbi.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    })
  );
  fireEvent.click(screen.getByRole("button", { name: "Import ABI" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  resolve({ abi: original });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(apply).not.toHaveBeenCalled();
});
it("resets custom overrides", async () => {
  render(page(true));
  await open();
  fireEvent.click(screen.getByRole("button", { name: "Reset ABI" }));
  expect(reset).toHaveBeenCalledOnce();
});

it("orders the tabs and reopens the last successfully applied mode", async () => {
  render(page());
  await open();
  expect(screen.getAllByRole("tab").map(tab => tab.textContent)).toEqual(["Add functions", "ABI", "From contract"]);
  expect(screen.getByRole("tab", { name: "Add functions" }).getAttribute("aria-selected")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Apply ABI" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await open();
  expect(screen.getByRole("tab", { name: "Add functions" }).getAttribute("aria-selected")).toBe("true");
  fireEvent.click(screen.getByRole("tab", { name: "ABI" }));
  fireEvent.click(screen.getByRole("button", { name: "Apply ABI" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await open();
  expect(screen.getByRole("tab", { name: "ABI" }).getAttribute("aria-selected")).toBe("true");
  // Viewing another tab or failing validation does not replace the saved mode.
  fireEvent.click(screen.getByRole("tab", { name: "From contract" }));
  fireEvent.click(screen.getByRole("button", { name: "Import ABI" }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await open();
  expect(screen.getByRole("tab", { name: "ABI" }).getAttribute("aria-selected")).toBe("true");
});

it("remembers source address, network and import mode on cancel and after a successful import", async () => {
  fetchAbi.mockResolvedValue({ abi: original });
  render(page());
  await open();
  fireEvent.click(screen.getByRole("tab", { name: "From contract" }));
  const source = "0x0000000000000000000000000000000000000002";
  fireEvent.change(screen.getByRole("textbox", { name: "Source contract" }), { target: { value: source } });
  fireEvent.change(screen.getByRole("combobox", { name: "Source network" }), { target: { value: "8453" } });
  fireEvent.change(screen.getByRole("combobox", { name: "Import mode" }), { target: { value: "merge" } });
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await open();
  expect(screen.getByRole("tab", { name: "Add functions" }).getAttribute("aria-selected")).toBe("true");
  fireEvent.click(screen.getByRole("tab", { name: "From contract" }));
  expect((screen.getByRole("textbox", { name: "Source contract" }) as HTMLInputElement).value).toBe(source);
  expect((screen.getByRole("combobox", { name: "Source network" }) as HTMLSelectElement).value).toBe("8453");
  expect((screen.getByRole("combobox", { name: "Import mode" }) as HTMLSelectElement).value).toBe("merge");
  fireEvent.click(screen.getByRole("button", { name: "Import ABI" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await open();
  expect(screen.getByRole("tab", { name: "From contract" }).getAttribute("aria-selected")).toBe("true");
  expect((screen.getByRole("textbox", { name: "Source contract" }) as HTMLInputElement).value).toBe(source);
  expect((screen.getByRole("combobox", { name: "Source network" }) as HTMLSelectElement).value).toBe("8453");
  expect((screen.getByRole("combobox", { name: "Import mode" }) as HTMLSelectElement).value).toBe("merge");
  expect(fetchAbi).toHaveBeenCalledWith({ address: source, chainId: 8453 });
});
