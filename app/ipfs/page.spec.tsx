import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { ChakraProvider } from "@chakra-ui/react";
import IPFSGateways from "./page";
import { IPFS_EXAMPLES } from "./input";
import { IPFS_GATEWAYS, PUBLIC_IPFS_GATEWAYS } from "@/lib/ipfs";

vi.mock("@/components/Layout", () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <main>{children}</main>
  ),
}));
afterEach(cleanup);

it("lists IPFS.io and dweb.link after Pinata while retaining HTTP-only preview fallbacks", () => {
  expect(
    PUBLIC_IPFS_GATEWAYS.slice(0, 3).map((gateway) => gateway.name)
  ).toEqual(["Pinata", "IPFS.io", "dweb.link"]);
  expect(IPFS_GATEWAYS).toEqual([
    "https://gateway.pinata.cloud/ipfs/",
    "https://ipfs.filebase.io/ipfs/",
    "https://ipfs.orbitor.dev/ipfs/",
  ]);
});

it("lists gateways before input and updates content links instantly from either example", () => {
  render(
    <ChakraProvider>
      <NuqsTestingAdapter hasMemory>
        <IPFSGateways />
      </NuqsTestingAdapter>
    </ChakraProvider>
  );
  for (const gateway of PUBLIC_IPFS_GATEWAYS)
    expect(
      screen
        .getByRole("link", { name: `Visit ${gateway.name}` })
        .getAttribute("href")
    ).toBe(gateway.website);
  for (const example of IPFS_EXAMPLES) {
    fireEvent.click(screen.getByRole("button", { name: example.label }));
    expect(
      (screen.getByLabelText("IPFS hash or URL") as HTMLInputElement).value
    ).toBe(example.value);
    for (const gateway of PUBLIC_IPFS_GATEWAYS) {
      const link = screen.getByRole("link", {
        name: `Open content via ${gateway.name}`,
      });
      expect(link.getAttribute("href")).toBe(
        gateway.url + example.value.replace("ipfs://", "")
      );
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toContain("noopener");
    }
  }
  fireEvent.click(screen.getByRole("button", { name: "Clear IPFS input" }));
  expect(screen.getByRole("link", { name: "Visit Pinata" })).toBeTruthy();
});

it("shows invalid input without keeping stale content links and preserves gateway URL suffixes", () => {
  render(
    <ChakraProvider>
      <NuqsTestingAdapter hasMemory>
        <IPFSGateways />
      </NuqsTestingAdapter>
    </ChakraProvider>
  );
  const input = screen.getByLabelText("IPFS hash or URL");
  const path = `${IPFS_EXAMPLES[0].value}/file.json?download=1#content`;
  fireEvent.change(input, {
    target: { value: `https://any-gateway.example/ipfs/${path}` },
  });
  expect(
    screen
      .getByRole("link", { name: "Open content via Filebase" })
      .getAttribute("href")
  ).toBe("https://ipfs.filebase.io/ipfs/" + path);
  fireEvent.change(input, { target: { value: "invalid hash" } });
  expect(input.getAttribute("aria-invalid")).toBe("true");
  expect(
    screen.getByText("Enter a valid IPFS CID or a URL containing one.")
  ).toBeTruthy();
  expect(
    screen.queryByRole("link", { name: "Open content via Filebase" })
  ).toBeNull();
});

it("restores a shared CID, including its path and query, on page load", () => {
  const path = `${IPFS_EXAMPLES[0].value}/metadata.json?download=1#item`;
  render(
    <ChakraProvider>
      <NuqsTestingAdapter hasMemory searchParams={{ cid: path }}>
        <IPFSGateways />
      </NuqsTestingAdapter>
    </ChakraProvider>
  );
  expect(
    (screen.getByLabelText("IPFS hash or URL") as HTMLInputElement).value
  ).toBe(path);
  expect(
    screen
      .getByRole("link", { name: "Open content via Filebase" })
      .getAttribute("href")
  ).toBe("https://ipfs.filebase.io/ipfs/" + path);
});

it("shares the extracted CID on paste, preserves other parameters, and removes it on clear", async () => {
  const update = vi.fn();
  render(
    <ChakraProvider>
      <NuqsTestingAdapter
        hasMemory
        searchParams="?source=shared"
        onUrlUpdate={update}
      >
        <IPFSGateways />
      </NuqsTestingAdapter>
    </ChakraProvider>
  );
  const path = `${IPFS_EXAMPLES[0].value}/metadata.json?download=1#item`;
  fireEvent.change(screen.getByLabelText("IPFS hash or URL"), {
    target: { value: `https://any-gateway.example/ipfs/${path}` },
  });
  await waitFor(() => expect(update).toHaveBeenCalled());
  expect(update.mock.lastCall![0].searchParams.get("cid")).toBe(path);
  expect(update.mock.lastCall![0].searchParams.get("source")).toBe("shared");
  fireEvent.click(screen.getByRole("button", { name: "Clear IPFS input" }));
  await waitFor(() =>
    expect(update.mock.lastCall![0].searchParams.has("cid")).toBe(false)
  );
  expect(update.mock.lastCall![0].searchParams.get("source")).toBe("shared");
});
