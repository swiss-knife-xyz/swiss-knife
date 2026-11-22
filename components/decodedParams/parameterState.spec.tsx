import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { StringParam } from "./StringParam";
import { TreeBytesParam } from "./TreeView/TreeBytesParam";
import { ExampleSnapshotContext } from "./ExampleSnapshotContext";

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("axios", () => ({ default: { get: mocks.get } }));
vi.mock("@/utils", () => ({
  decodeBase64: () => null,
  isBigInt: () => false,
  isValidJSON: (s: string) => {
    try {
      return typeof JSON.parse(s) === "object";
    } catch {
      return false;
    }
  },
  resolveIPFS: (s: string) => s,
  startHexWith0x: (s: string) => (s.startsWith("0x") ? s : `0x${s}`),
}));
vi.mock("@/components/InputField", () => ({
  InputField: ({ value }: any) => <input readOnly value={value} />,
}));
vi.mock("@/components/CopyToClipboard", () => ({
  CopyToClipboard: () => null,
}));
vi.mock("@/components/ResizableImage", () => ({
  ResizableImage: ({ src }: any) => (
    <span role="img" aria-label="URL preview" data-src={src} />
  ),
}));
vi.mock("@/components/renderParams", () => ({ renderParamTypes: () => null }));
vi.mock("@monaco-editor/react", () => ({ Editor: () => null }));
vi.mock("@/components/Tabs/TabsSelector", () => ({ default: () => null }));
vi.mock("@/components/DarkSelect", () => ({
  DarkSelect: ({ options, selectedOption, setSelectedOption }: any) => (
    <select
      aria-label="Bytes format"
      value={selectedOption.value}
      onChange={(e) =>
        setSelectedOption(options.flatMap((entry: any) => entry.options ?? [entry]).find((o: any) => o.value === e.target.value))
      }
    >
      {options.flatMap((entry: any) => entry.options ?? [entry]).map((o: any) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
const wrap = (children: React.ReactNode) => (
  <ChakraProvider>{children}</ChakraProvider>
);
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

it("clears URL metadata when the parameter changes and ignores late URL responses", async () => {
  const second = deferred<any>();
  const third = deferred<any>();
  mocks.get
    .mockResolvedValueOnce({ data: { title: "First metadata" }, headers: {} })
    .mockReturnValueOnce(second.promise)
    .mockReturnValueOnce(third.promise);
  const committedValues: string[][] = [];
  function Capture({ value }: { value: string }) {
    React.useLayoutEffect(() => {
      committedValues.push(
        Array.from(document.querySelectorAll("input"), (i) => i.value)
      );
    });
    return <StringParam value={value} />;
  }
  const view = render(wrap(<Capture value="https://example.test/first" />));
  await screen.findByDisplayValue("First metadata");
  committedValues.length = 0;
  view.rerender(wrap(<Capture value="https://example.test/second" />));
  expect(committedValues.flat()).not.toContain("First metadata");
  expect(screen.queryByDisplayValue("First metadata")).toBeNull();
  expect(screen.getByDisplayValue("https://example.test/second")).toBeTruthy();
  view.rerender(wrap(<Capture value="https://example.test/third" />));
  await act(async () =>
    third.resolve({ data: { title: "Current metadata" }, headers: {} })
  );
  await screen.findByDisplayValue("Current metadata");
  await act(async () =>
    second.resolve({ data: { title: "Stale metadata" }, headers: {} })
  );
  expect(screen.queryByDisplayValue("Stale metadata")).toBeNull();
  expect(screen.getByDisplayValue("Current metadata")).toBeTruthy();
});

it("does not restore live URL enrichment into a saved snapshot", async () => {
  const response = deferred<any>();
  mocks.get.mockReturnValue(response.promise);
  const url = "https://example.test/metadata";
  const view = render(wrap(<StringParam value={url} />));
  view.rerender(
    wrap(
      <ExampleSnapshotContext.Provider value={{ addresses: {}, urls: {} }}>
        <StringParam value={url} />
      </ExampleSnapshotContext.Provider>
    )
  );
  await act(async () =>
    response.resolve({ data: { title: "Live metadata" }, headers: {} })
  );
  expect(screen.queryByDisplayValue("Live metadata")).toBeNull();
  expect(screen.getByDisplayValue(url)).toBeTruthy();
  expect(mocks.get).toHaveBeenCalledTimes(1);
});

it("does not retain a previous bytes conversion for invalid or empty bytes", () => {
  const param = (rawValue: string) =>
    wrap(<TreeBytesParam arg={{ rawValue, value: { decoded: null } }} />);
  const view = render(param("0x2a"));
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "decimal" },
  });
  expect(screen.getByDisplayValue("42")).toBeTruthy();
  view.rerender(param("Safe multisend summary"));
  expect(screen.queryByDisplayValue("42")).toBeNull();
  view.rerender(param("0x"));
  expect(screen.getByDisplayValue("0")).toBeTruthy();
  view.rerender(param("0x10"));
  expect(screen.getByDisplayValue("16")).toBeTruthy();
});
