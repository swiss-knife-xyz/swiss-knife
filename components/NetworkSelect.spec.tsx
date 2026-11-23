import { useState } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { NetworkSelect } from "./NetworkSelect";

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addListener() {},
    removeListener() {},
  }));
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function Tools() {
  const [source, setSource] = useState(1);
  const [destination, setDestination] = useState(1);
  return (
    <ChakraProvider>
      <NetworkSelect
        ariaLabel="Source network"
        networks={[1, 8453]}
        chainId={source}
        onChange={setSource}
      />
      <NetworkSelect
        ariaLabel="Destination network"
        networks={[1, 42161]}
        chainId={destination}
        onChange={setDestination}
      />
      <output data-testid="source">{source}</output>
      <output data-testid="destination">{destination}</output>
    </ChakraProvider>
  );
}
it("searches by chain ID and keeps independent selections and supported lists", async () => {
  render(<Tools />);
  const source = await screen.findByRole("combobox", {
    name: "Source network",
  });
  fireEvent.focus(source);
  fireEvent.keyDown(source, { key: "ArrowDown" });
  fireEvent.change(source, { target: { value: "8453" } });
  const option = await screen.findByRole("option", { name: /Base/ });
  expect(screen.queryByRole("option", { name: /Arbitrum/ })).toBeNull();
  fireEvent.click(option);
  expect(screen.getByTestId("source").textContent).toBe("8453");
  expect(screen.getByTestId("destination").textContent).toBe("1");
  const destination = screen.getByRole("combobox", {
    name: "Destination network",
  });
  fireEvent.focus(destination);
  fireEvent.keyDown(destination, { key: "ArrowDown" });
  fireEvent.change(destination, { target: { value: "Arbitrum" } });
  fireEvent.click(await screen.findByRole("option", { name: /Arbitrum/ }));
  expect(screen.getByTestId("source").textContent).toBe("8453");
  expect(screen.getByTestId("destination").textContent).toBe("42161");
});
it("only calls the local selection handler when a network is chosen", async () => {
  const changed = vi.fn();
  render(
    <ChakraProvider>
      <NetworkSelect
        ariaLabel="Network"
        networks={[1, 8453]}
        chainId={1}
        onChange={changed}
      />
    </ChakraProvider>
  );
  expect(changed).not.toHaveBeenCalled();
  const input = await screen.findByRole("combobox", { name: "Network" });
  fireEvent.keyDown(input, { key: "ArrowDown" });
  fireEvent.click(await screen.findByRole("option", { name: /Base/ }));
  expect(changed).toHaveBeenCalledExactlyOnceWith(8453);
});

it("groups flat explorer-style options into mainnets and testnets", async () => {
  render(
    <ChakraProvider>
      <NetworkSelect chainId={1} onChange={() => {}} options={[
        { value: 1, label: "Ethereum" },
        { value: 11155111, label: "Sepolia" },
      ]} />
    </ChakraProvider>
  );
  const input = await screen.findByRole("combobox", { name: "Network" });
  fireEvent.keyDown(input, { key: "ArrowDown" });
  expect(screen.getByText("Mainnets")).toBeTruthy();
  expect(screen.getByText("Testnets")).toBeTruthy();
  expect(screen.getAllByRole("option").map(option => option.textContent)).toEqual(["Ethereum1", "Sepolia11155111"]);
});

it("focuses and opens the shared dropdown when entering network edit mode", async () => {
  render(
    <ChakraProvider>
      <NetworkSelect ariaLabel="Target network" chainId={1}
        networks={[1, 8453]} onChange={() => {}} autoFocus openMenuOnFocus />
    </ChakraProvider>
  );
  const input = await screen.findByRole("combobox", { name: "Target network" });
  expect(document.activeElement).toBe(input);
  expect(await screen.findByRole("option", { name: /Base/ })).toBeTruthy();
});
