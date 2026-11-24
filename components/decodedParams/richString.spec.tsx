import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { StringParam } from "./StringParam";
import {
  ExampleSnapshotContext,
  type ExampleEnrichment,
} from "./ExampleSnapshotContext";

const mocks = vi.hoisted(() => ({ copy: vi.fn(), get: vi.fn() }));
vi.mock("axios", () => ({ default: { get: mocks.get } }));
vi.mock("@/components/CopyToClipboard", () => ({
  CopyToClipboard: ({ textToCopy, "aria-label": label }: any) => (
    <button
      aria-label={label ?? "Copy value"}
      onClick={() => mocks.copy(textToCopy)}
    >
      Copy
    </button>
  ),
}));

vi.mock("@monaco-editor/react", () => ({
  Editor: ({ value, options }: any) => (
    <textarea
      aria-label={options?.ariaLabel ?? "Editor"}
      value={value}
      readOnly={options?.readOnly}
    />
  ),
}));

function show(
  value: string,
  urls: ExampleEnrichment["urls"] = {},
  disableRich = false
) {
  return render(
    <ChakraProvider>
      <ExampleSnapshotContext.Provider value={{ addresses: {}, urls }}>
        <StringParam value={value} disableRich={disableRich} />
      </ExampleSnapshotContext.Provider>
    </ChakraProvider>
  );
}
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it("uses one toolbar for metadata, nested JSON and image URLs, and copies the selected representation", async () => {
  const uri = "ipfs://metadata/1";
  const metadata = {
    name: "Example NFT",
    description: "A test artwork",
    image: "ipfs://artwork",
    attributes: [{ trait_type: "Eyes", value: "Laser" }],
    extra: '{"enabled":false}',
  };
  show(uri, {
    [uri]: { json: metadata },
    "ipfs://artwork": { image: "/decoder-examples/zora-20000.jpg" },
  });
  expect(
    screen.getAllByRole("group", { name: "String output views" })
  ).toHaveLength(1);
  expect(screen.getByDisplayValue("Example NFT")).toBeTruthy();
  expect(screen.getByAltText("Image preview").getAttribute("src")).toBe(
    "/decoder-examples/zora-20000.jpg"
  );
  expect(document.querySelectorAll(".rich-string-viewer")).toHaveLength(1);
  expect(mocks.get).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Raw JSON" }));
  const raw = (await screen.findByRole("textbox", {
    name: "Raw JSON",
  })) as HTMLTextAreaElement;
  expect(JSON.parse(raw.value)).toEqual(metadata);
  fireEvent.click(screen.getByRole("button", { name: "Copy decoded content" }));
  expect(mocks.copy).toHaveBeenLastCalledWith(raw.value);
  fireEvent.click(screen.getByRole("button", { name: "Original" }));
  expect(screen.getByDisplayValue(uri)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Copy original string" }));
  expect(mocks.copy).toHaveBeenLastCalledWith(uri);
  fireEvent.click(screen.getByRole("button", { name: "Preview" }));
  expect(screen.getByDisplayValue("Example NFT")).toBeTruthy();
});

it("keeps false, zero, empty collections and long field names readable in nested JSON", () => {
  show(
    JSON.stringify({
      a_very_long_metadata_field_name: { enabled: false, count: 0 },
      empty: [],
      object: {},
    })
  );
  expect(screen.getByDisplayValue("false")).toBeTruthy();
  expect(screen.getByDisplayValue("0")).toBeTruthy();
  expect(screen.getByText("Empty array")).toBeTruthy();
  expect(screen.getByText("Empty object")).toBeTruthy();
  const nested = screen.getByRole("button", {
    name: /a_very_long_metadata_field_name/,
  });
  fireEvent.click(nested);
  expect(nested.getAttribute("aria-expanded")).toBe("false");
});

it("previews base64 JSON and preserves the exact original data URI", () => {
  const value = `data:application/json;base64,${btoa('{"name":"Onchain NFT"}')}`;
  show(value);
  expect(screen.getByDisplayValue("Onchain NFT")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Original" }));
  expect(screen.getByDisplayValue(value)).toBeTruthy();
});

it("keeps snapshot enrichment offline even for image-looking URLs with no saved image", () => {
  show("https://example.test/missing.png");
  expect(screen.queryByAltText("Image preview")).toBeNull();
  expect(screen.getByText("Preview unavailable")).toBeTruthy();
  expect(mocks.get).not.toHaveBeenCalled();
});

it("shows image failures inline and renders long plain strings without a viewer", () => {
  const view = show("ipfs://image", {
    "ipfs://image": { image: "/missing.jpg" },
  });
  fireEvent.error(screen.getByAltText("Image preview"));
  expect(screen.getByText("Image unavailable")).toBeTruthy();
  view.unmount();
  show("x".repeat(250), {}, true);
  expect(screen.getByRole("textbox", { name: "String value" })).toBeTruthy();
  expect(
    screen.queryByRole("group", { name: "String output views" })
  ).toBeNull();
});
