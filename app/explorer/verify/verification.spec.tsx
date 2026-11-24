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
  within,
} from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { VerificationTool } from "./VerificationTool";
import {
  importBlockscoutSource,
  type VerificationTarget,
} from "@/lib/verification/source";
import { address, fixture } from "@/lib/verification/fixtures";
const review = {
  ...importBlockscoutSource(fixture),
  id: "a".repeat(64),
  chainId: "1",
  address,
  sourceProvider: "blockscout",
  sourceUrl: `https://eth.blockscout.com/address/${address}?tab=contract`,
  destinationUrl: `https://etherscan.io/address/${address}#code`,
  targets: [
    {
      provider: "etherscan",
      state: "ready",
      destinationUrl: `https://etherscan.io/address/${address}#code`,
    },
    {
      provider: "blockscout",
      state: "already_verified",
      destinationUrl: `https://eth.blockscout.com/address/${address}`,
    },
    {
      provider: "sourcify",
      state: "ready",
      destinationUrl: `https://repo.sourcify.dev/1/${address}`,
    },
  ],
  expiresAt: "2030-01-01T00:00:00Z",
};
const status = (state: string) => ({
  id: review.id,
  state,
  destinationUrl: review.destinationUrl,
  targets: review.targets.map((t) =>
    t.state === "ready" ? { ...t, state } : t
  ),
});
beforeEach(() => {
  localStorage.clear();
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function mount() {
  return render(
    <ChakraProvider>
      <VerificationTool />
    </ChakraProvider>
  );
}
async function load() {
  fireEvent.change(screen.getByLabelText("Contract address or explorer URL"), {
    target: { value: address },
  });
  fireEvent.click(screen.getByRole("button", { name: "Find verified source" }));
  await screen.findByRole("heading", { name: "Example" });
}
function consent() {
  const checkbox = screen.getByRole("checkbox", {
    name: /Publish this source and settings/,
  }) as HTMLInputElement;
  if (!checkbox.checked) fireEvent.click(checkbox);
}
it("only imports on request, defaults publication on, honors opting out and submits only bound targets", async () => {
  const fetcher = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(Response.json(review))
    .mockResolvedValueOnce(Response.json(status("pending")))
    .mockResolvedValueOnce(Response.json(status("verified")));
  mount();
  expect(fetcher).not.toHaveBeenCalled();
  await load();
  expect(screen.getByText(review.compilerVersion)).toBeTruthy();
  const publish = screen.getByRole("checkbox", {
    name: /Publish this source and settings/,
  }) as HTMLInputElement;
  expect(publish.checked).toBe(true);
  expect(
    screen
      .getByRole("button", { name: "Verify selected" })
      .hasAttribute("disabled")
  ).toBe(false);
  fireEvent.click(publish);
  expect(
    screen
      .getByRole("button", { name: "Verify selected" })
      .hasAttribute("disabled")
  ).toBe(true);
  expect(screen.queryByRole("checkbox", { name: "Blockscout" })).toBeNull();
  expect(
    within(screen.getByRole("status")).getByText("Blockscout", { exact: true })
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("checkbox", { name: "Sourcify" }));
  consent();
  fireEvent.click(screen.getByRole("button", { name: "Verify selected" }));
  await screen.findAllByText("Verifying…");
  const body = JSON.parse(String(fetcher.mock.calls[1][1]?.body));
  expect(body).toEqual({
    operation: "submit",
    chainId: "1",
    address,
    id: review.id,
    confirmed: true,
    providers: ["etherscan"],
    retry: true,
  });
  fireEvent.click(screen.getByRole("button", { name: "Check status" }));
  await screen.findAllByText("Verified");
  expect(fetcher).toHaveBeenCalledTimes(3);
  for (const [url, init] of fetcher.mock.calls) {
    expect(url).toBe("/api/verification");
    expect(init?.method).toBe("POST");
  }
});
it("changing network invalidates consent and ignores a delayed preview", async () => {
  let resolve!: (r: Response) => void;
  vi.spyOn(globalThis, "fetch")
    .mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        })
    )
    .mockResolvedValue(Response.json(review));
  mount();
  fireEvent.change(screen.getByLabelText("Contract address or explorer URL"), {
    target: { value: address },
  });
  fireEvent.click(screen.getByRole("button", { name: "Find verified source" }));
  fireEvent.keyDown(screen.getByRole("combobox", { name: "Network" }), {
    key: "ArrowDown",
  });
  fireEvent.click(
    await screen.findByRole("option", { name: /Polygon.*137$/ })
  );
  resolve(Response.json(review));
  await waitFor(() =>
    expect(screen.queryByRole("heading", { name: "Example" })).toBeNull()
  );
  fireEvent.keyDown(screen.getByRole("combobox", { name: "Network" }), {
    key: "ArrowDown",
  });
  fireEvent.click(
    await screen.findByRole("option", { name: /Ethereum.* 1$/ })
  );
  await load();
  consent();
  fireEvent.change(screen.getByLabelText("Contract address or explorer URL"), {
    target: { value: "0x22" },
  });
  expect(screen.queryByRole("heading", { name: "Example" })).toBeNull();
});
it("a pasted explorer URL selects network and source without fetching until requested", async () => {
  const fetcher = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(Response.json({ ...review, chainId: "84532" }));
  mount();
  fireEvent.change(screen.getByLabelText("Contract address or explorer URL"), {
    target: {
      value: `https://base-sepolia.blockscout.com/address/${address}?tab=contract`,
    },
  });
  expect(fetcher).not.toHaveBeenCalled();
  expect(
    (
      screen.getByLabelText(
        "Contract address or explorer URL"
      ) as HTMLInputElement
    ).value
  ).toBe(address);
  fireEvent.click(screen.getByRole("button", { name: "Find verified source" }));
  await screen.findByRole("heading", { name: "Example" });
  expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toMatchObject({
    chainId: "84532",
    sourceProvider: "blockscout",
    address,
  });
});
it("uncertain submissions retain checkable handles and never offer an automatic resend", async () => {
  const fetcher = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(Response.json(review))
    .mockRejectedValueOnce(new Error("SECRET_PROVIDER_ERROR"))
    .mockResolvedValueOnce(Response.json(status("pending")));
  mount();
  await load();
  consent();
  fireEvent.click(screen.getByRole("button", { name: "Verify selected" }));
  await screen.findByText(/submission response was lost/);
  expect(screen.queryByRole("button", { name: "Verify selected" })).toBeNull();
  expect(document.body.textContent).not.toContain("SECRET_PROVIDER_ERROR");
  fireEvent.click(screen.getByRole("button", { name: "Check status" }));
  await screen.findAllByText("Verifying…");
  expect(fetcher).toHaveBeenCalledTimes(3);
});
it("user keys go only to explorer APIs and are never persisted or sent to our backend", async () => {
  const etherscanFixture = {
    status: "1",
    result: [
      {
        SourceCode: review.sourceCode,
        CompilerVersion: review.compilerVersion,
        ContractName: "Example",
        ContractFileName: fixture.file_path,
        ConstructorArguments: "1234",
        LicenseType: "MIT",
      },
    ],
  };
  const fetcher = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (url) => {
      const host = new URL(String(url)).hostname;
      if (host === "api.etherscan.io" || host === "api.routescan.io")
        return Response.json(etherscanFixture);
      if (host.endsWith("blockscout.com")) return Response.json(fixture);
      if (host === "sourcify.dev")
        return Response.json({ match: "exact_match" });
      throw new Error("Unexpected same-origin request");
    });
  mount();
  fireEvent.change(screen.getByLabelText("Etherscan API key"), {
    target: { value: "FAKE_SENTINEL_PRIVATE_121" },
  });
  await load();
  expect(fetcher.mock.calls.length).toBeGreaterThan(0);
  for (const [url, init] of fetcher.mock.calls) {
    expect(String(url)).not.toBe("/api/verification");
    expect(new URL(String(url)).hostname).not.toBe("eth.sh");
    expect(String(init?.body)).not.toContain("FAKE_SENTINEL_PRIVATE_121");
  }
  expect(
    fetcher.mock.calls.some(
      ([url]) =>
        new URL(String(url)).searchParams.get("apikey") ===
        "FAKE_SENTINEL_PRIVATE_121"
    )
  ).toBe(true);
  expect(localStorage.getItem("verification:active:v2")).toBeNull();
  expect(JSON.stringify(localStorage)).not.toContain("FAKE_SENTINEL");
});
it("failed direct explorer requests never retry through our server", async () => {
  const fetcher = vi
    .spyOn(globalThis, "fetch")
    .mockRejectedValue(new TypeError("FAKE_SENTINEL_PRIVATE_121"));
  mount();
  fireEvent.change(screen.getByLabelText("Etherscan API key"), {
    target: { value: "FAKE_SENTINEL_PRIVATE_121" },
  });
  fireEvent.change(screen.getByLabelText("Contract address or explorer URL"), {
    target: { value: `https://etherscan.io/address/${address}` },
  });
  fireEvent.click(screen.getByRole("button", { name: "Find verified source" }));
  await screen.findByRole("alert");
  expect(
    screen.getByText("Could not reach this explorer from your browser.")
  ).toBeTruthy();
  expect(document.body.textContent).not.toContain("FAKE_SENTINEL_PRIVATE_121");
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(new URL(String(fetcher.mock.calls[0][0])).hostname).toBe(
    "api.etherscan.io"
  );
});
it("refresh restores a pending verification without another source import or submission", async () => {
  localStorage.setItem(
    "verification:active:v2",
    JSON.stringify({ id: review.id, chainId: "1", address })
  );
  const fetcher = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(Response.json({ review, status: status("pending") }));
  mount();
  await screen.findByRole("heading", { name: "Example" });
  await screen.findAllByText("Verifying…");
  expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body)).operation).toBe(
    "resume"
  );
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("button", { name: "Verify selected" })).toBeNull();
});
it("errors use local copy rather than reflecting upstream strings", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    Response.json(
      { error: { code: "UNAVAILABLE", message: "PRIVATE_SECRET" } },
      { status: 422 }
    )
  );
  mount();
  fireEvent.change(screen.getByLabelText("Contract address or explorer URL"), {
    target: { value: address },
  });
  fireEvent.click(screen.getByRole("button", { name: "Find verified source" }));
  await screen.findByRole("alert");
  expect(document.body.textContent).not.toContain("PRIVATE_SECRET");
});

it("different deployment controls send the selected network, address and explicit constructor arguments", async () => {
  const fetcher = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(Response.json(review));
  mount();
  fireEvent.change(screen.getByLabelText("Contract address or explorer URL"), {
    target: { value: address },
  });
  fireEvent.click(
    screen.getByRole("checkbox", { name: "Different deployment" })
  );
  fireEvent.change(screen.getByLabelText("Destination address"), {
    target: { value: "0x" + "22".repeat(20) },
  });
  fireEvent.change(screen.getByLabelText("Destination constructor arguments"), {
    target: { value: "0xabcd" },
  });
  fireEvent.keyDown(
    screen.getByRole("combobox", { name: "Destination network" }),
    { key: "ArrowDown" }
  );
  fireEvent.click(
    await screen.findByRole("option", { name: /Base Sepolia/ })
  );
  fireEvent.click(screen.getByRole("button", { name: "Find verified source" }));
  await screen.findByRole("heading", { name: "Example" });
  expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toMatchObject({
    chainId: "1",
    address,
    targetChainId: "84532",
    targetAddress: "0x" + "22".repeat(20),
    constructorArguments: "0xabcd",
    destinations: ["etherscan", "blockscout", "sourcify"],
  });
});

it("proxy implementation shortcut fills a separate import without submitting anything", async () => {
  const impl = "0x" + "33".repeat(20);
  const fetcher = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(
      Response.json({ ...review, implementationAddress: impl })
    );
  const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  mount();
  await load();
  fireEvent.click(
    screen.getByRole("button", { name: "Verify implementation" })
  );
  expect(
    (
      screen.getByLabelText(
        "Contract address or explorer URL"
      ) as HTMLInputElement
    ).value
  ).toBe(impl);
  expect(screen.queryByRole("heading", { name: "Example" })).toBeNull();
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(scroll).toHaveBeenCalled();
});

it("a rejected destination request shows an error instead of Ready while other providers remain successful", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    Response.json({
      ...review,
      targets: review.targets.map((t) =>
        t.provider === "etherscan"
          ? { ...t, state: "ready", error: "PROVIDER_REJECTED" }
          : { ...t, state: "already_verified" }
      ),
    })
  );
  mount();
  await load();
  expect(screen.getByText("Request failed")).toBeTruthy();
  expect(screen.queryByText("Ready", { exact: true })).toBeNull();
  expect(screen.getAllByText("Already verified")).toHaveLength(2);
  expect(
    screen.getByText(
      "The provider rejected this request. Check the API key and its network access."
    )
  ).toBeTruthy();
});
