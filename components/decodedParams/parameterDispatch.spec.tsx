import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { renderParamTypes } from "../fnParams/Renderer";
import { CalldataTree } from "./CalldataTree";
import { ExampleSnapshotContext } from "./ExampleSnapshotContext";
import { contractOutputArg } from "@/lib/contractOutput";

vi.mock("@/hooks/useAddressBook", () => ({ useAddressBook: () => ({ getLabel: () => null, isReady: true }) }));
vi.mock("@/components/ContractTabs", () => ({ ContractAddressLink: ({ children, href, "aria-label": label }: any) => <a href={href} aria-label={label}>{children}</a> }));
afterEach(cleanup);

it.each(["explorer", "decoder"])("keeps network context for addresses inside %s string metadata", async path => {
  const address = "0x0000000000000000000000000000000000000001";
  const value = JSON.stringify({ recipient: address });
  render(<ChakraProvider><ExampleSnapshotContext.Provider value={{ addresses: {}, urls: {} }}>
    {path === "explorer" ? renderParamTypes({ chainId: 8453, type: "string", value }) : <CalldataTree args={[contractOutputArg({ type: "string", name: "metadata" }, value)]} chainId={8453} showControls={false} />}
  </ExampleSnapshotContext.Provider></ChakraProvider>);
  const link = await screen.findByRole("link", { name: `Open address ${address}` });
  expect(link.getAttribute("href")).toContain(`/8453/${address}`);
});
