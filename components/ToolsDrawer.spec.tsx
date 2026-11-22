import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
vi.mock("next/link", () => ({ default: "a" }));
vi.mock("next/navigation", () => ({ usePathname: () => "/explorer/" }));
vi.mock("@/utils", () => ({ getPath: (base: string) => `/${base}/` }));
import { toolEntries, usefulToolEntries } from "@/data/toolCatalog";
import { ToolsNavigation } from "./ToolsDrawer";
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
