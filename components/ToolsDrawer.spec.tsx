import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
vi.mock("next/link", () => ({ default: "a" }));
vi.mock("next/navigation", () => ({ usePathname: () => "/explorer/" }));
vi.mock("@/utils", () => ({ getPath: (base: string) => `/${base}/` }));
import { toolEntries, usefulToolEntries } from "@/data/toolCatalog";
import { ToolsNavigation } from "./ToolsDrawer";
import { ToolsMenu } from "./ToolsMenu";
import { HomePageNavBar } from "./HomePage/HomePageNavBar";
afterEach(cleanup);
function mount(query = "") {
  const onNavigate = vi.fn();
  render(
    <ChakraProvider>
      <ToolsNavigation query={query} onNavigate={onNavigate} />
    </ChakraProvider>
  );
  return onNavigate;
}
it("puts developer tools first and links Explorer directly beside its verification tool", () => {
  window.history.replaceState({}, "", "/explorer/");
  mount();
  expect(
    screen.getAllByRole("heading").map((element) => element.textContent)
  ).toEqual(["Tools for Devs", "Useful Tools", "Directories"]);
  expect(
    screen
      .getByRole("link", { name: "Explorer" })
      .getAttribute("href")
  ).toBe("/explorer/");
  expect(
    screen
      .getByRole("link", { name: "Explorer" })
      .getAttribute("aria-current")
  ).toBe("page");
  expect(
    screen
      .getByRole("link", { name: "Cross-explorer Verification" })
      .getAttribute("href")
  ).toBe("/explorer/verify");
  expect(
    screen
      .getByRole("link", { name: "Deploy Mock Tokens" })
      .getAttribute("href")
  ).toBe("/mock-tokens/");
  expect(
    screen.getByRole("link", { name: "RPC Console" }).getAttribute("href")
  ).toBe("/rpc-console/");
});
it("expands related pages without intercepting the main link or navigating", () => {
  const onNavigate = mount();
  const toggle = screen.getByRole("button", {
    name: "Show Calldata Decoder pages",
  });
  expect(screen.queryByRole("link", { name: "Calldata Encoder" })).toBeNull();
  fireEvent.click(toggle);
  expect(onNavigate).not.toHaveBeenCalled();
  expect(toggle.getAttribute("aria-expanded")).toBe("true");
  expect(
    screen
      .getByRole("link", { name: "Calldata Decoder" })
      .getAttribute("href")
  ).toBe("/calldata/decoder");
  const encoder = screen.getByRole("link", { name: "Calldata Encoder" });
  expect(encoder.getAttribute("href")).toBe("/calldata/encoder");
  encoder.addEventListener("click", (event) => event.preventDefault());
  fireEvent.click(encoder);
  expect(onNavigate).toHaveBeenCalledOnce();
});
it("searches related pages and shows matching links without another expansion click", () => {
  mount("encoder");
  expect(
    screen.getByRole("link", { name: "Calldata Encoder" }).getAttribute("href")
  ).toBe("/calldata/encoder");
  expect(
    screen.queryByRole("link", { name: "Explorer" })
  ).toBeNull();
  expect(screen.queryByRole("heading", { name: "Directories" })).toBeNull();
});
it("searches explicit main-path and subpath tools and handles no matches", () => {
  const view = render(
    <ChakraProvider>
      <ToolsNavigation query="verify" onNavigate={vi.fn()} />
    </ChakraProvider>
  );
  expect(
    screen.getByRole("link", { name: "Cross-explorer Verification" })
  ).toBeTruthy();
  view.rerender(
    <ChakraProvider>
      <ToolsNavigation query="not-a-tool" onNavigate={vi.fn()} />
    </ChakraProvider>
  );
  expect(screen.getByText("No tools found.")).toBeTruthy();
  expect(screen.queryAllByRole("link")).toHaveLength(0);
});

it("places mock tokens after Safe in the shared homepage and drawer catalog", () => {
  const index = toolEntries.findIndex((tool) => tool.info.label === "Deploy Mock Tokens");
  expect(toolEntries[index - 1].info.label).toBe("Safe");
  expect(toolEntries[index].info.description).toBe("Quickly deploy ERC20, ERC721, ERC1155 for testing");
  expect(usefulToolEntries.some(([subdomain]) => String(subdomain) === "mock-tokens")).toBe(false);
  mount();
  const links = screen.getAllByRole("link");
  const safeIndex = links.findIndex((link) => link.textContent === "Safe");
  expect(links[safeIndex + 1].textContent).toBe("Deploy Mock Tokens");
});


it("opens with either keyboard shortcut and focuses search on every opening", async () => {
  render(<ChakraProvider><ToolsMenu /></ChakraProvider>);
  for (const modifier of [{ metaKey: true }, { ctrlKey: true }]) {
    fireEvent.keyDown(window, { key: "k", ...modifier });
    const search = await screen.findByRole("textbox", { name: "Find a tool" });
    await waitFor(() => expect(document.activeElement).toBe(search));
    fireEvent.change(search, { target: { value: "encoder" } });
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  }
  fireEvent.click(screen.getByRole("button", { name: "Open all tools" }));
  const search = await screen.findByRole("textbox", { name: "Find a tool" });
  await waitFor(() => expect(document.activeElement).toBe(search));
  expect((search as HTMLInputElement).value).toBe("");
});

it("provides the same menu and shortcut on the homepage", async () => {
  render(<ChakraProvider><HomePageNavBar /></ChakraProvider>);
  expect(screen.getByRole("button", { name: "Open all tools" })).toBeTruthy();
  fireEvent.keyDown(window, { key: "k", metaKey: true });
  const search = await screen.findByRole("textbox", { name: "Find a tool" });
  await waitFor(() => expect(document.activeElement).toBe(search));
});

it("ignores modified combinations and removes the shortcut listener on unmount", () => {
  const { unmount } = render(<ChakraProvider><ToolsMenu /></ChakraProvider>);
  for (const modifiers of [{}, { metaKey: true, shiftKey: true }, { metaKey: true, altKey: true }]) {
    fireEvent.keyDown(window, { key: "k", ...modifiers });
    expect(screen.queryByRole("dialog")).toBeNull();
  }
  unmount();
  const shortcut = new KeyboardEvent("keydown", { key: "k", metaKey: true, cancelable: true });
  window.dispatchEvent(shortcut);
  expect(shortcut.defaultPrevented).toBe(false);
});


it("navigates filtered parent and child results with arrows and wraps at both ends", async () => {
  render(<ChakraProvider><ToolsMenu /></ChakraProvider>);
  fireEvent.keyDown(window, { key: "k", metaKey: true });
  const search = await screen.findByRole("textbox", { name: "Find a tool" });
  await waitFor(() => expect(document.activeElement).toBe(search));
  fireEvent.change(search, { target: { value: "calldata" } });
  const links = screen.getAllByRole("link");
  expect(links.length).toBeGreaterThan(1);
  expect(links[0].getAttribute("data-keyboard-selected")).toBe("true");
  expect(document.activeElement).toBe(search);
  fireEvent.keyDown(search, { key: "ArrowDown" });
  expect(document.activeElement).toBe(search);
  expect(links[1].getAttribute("data-keyboard-selected")).toBe("true");
  expect(links[0].hasAttribute("data-keyboard-selected")).toBe(false);
  fireEvent.keyDown(search, { key: "ArrowUp" });
  expect(links[0].getAttribute("data-keyboard-selected")).toBe("true");
  fireEvent.keyDown(search, { key: "ArrowUp" });
  expect(links[links.length - 1].getAttribute("data-keyboard-selected")).toBe("true");
  fireEvent.keyDown(search, { key: "ArrowDown" });
  expect(links[0].getAttribute("data-keyboard-selected")).toBe("true");
  expect(document.activeElement).toBe(search);
  // Continuing to type resets selection to the first match without refocusing.
  fireEvent.change(search, { target: { value: "encoder" } });
  expect(document.activeElement).toBe(search);
  expect(screen.getByRole("link", { name: "Calldata Encoder" }).getAttribute("data-keyboard-selected")).toBe("true");
});

it("opens the first search result on Enter and safely ignores empty results", async () => {
  render(<ChakraProvider><ToolsMenu /></ChakraProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Open all tools" }));
  const search = await screen.findByRole("textbox", { name: "Find a tool" });
  await waitFor(() => expect(document.activeElement).toBe(search));
  fireEvent.change(search, { target: { value: "not-a-tool" } });
  fireEvent.keyDown(search, { key: "ArrowDown" });
  fireEvent.keyDown(search, { key: "Enter" });
  expect(document.activeElement).toBe(search);
  fireEvent.change(search, { target: { value: "encoder" } });
  const result = screen.getByRole("link", { name: "Calldata Encoder" });
  expect(result.getAttribute("data-keyboard-selected")).toBe("true");
  const navigate = vi.fn((event: Event) => event.preventDefault());
  result.addEventListener("click", navigate);
  fireEvent.keyDown(search, { key: "Enter" });
  expect(navigate).toHaveBeenCalledOnce();
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});
