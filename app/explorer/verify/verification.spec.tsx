import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { VerificationTool } from "./VerificationTool";
import { importBlockscoutSource } from "@/lib/verification/source";
import { address, fixture } from "@/lib/verification/fixtures";
const review = {
  ...importBlockscoutSource(fixture),
  id: "a".repeat(64),
  chainId: "1",
  address,
  sourceUrl: `https://eth.blockscout.com/address/${address}?tab=contract`,
  destinationUrl: `https://etherscan.io/address/${address}#code`,
  expiresAt: "2030-01-01T00:00:00Z",
};
const sentinel = "FAKE_SENTINEL_PRIVATE_KEY_121";
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
  fireEvent.change(screen.getByLabelText("Contract address"), {
    target: { value: address },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Import from Blockscout" })
  );
  await screen.findByRole("heading", { name: "Review verification" });
}
it("never imports on mount/typing, reviews exact data, requires consent and submits only the bound handle", async () => {
  const fetcher = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(Response.json(review))
    .mockResolvedValueOnce(
      Response.json({
        id: review.id,
        state: "pending",
        destinationUrl: review.destinationUrl,
      })
    )
    .mockResolvedValueOnce(
      Response.json({
        id: review.id,
        state: "verified",
        destinationUrl: review.destinationUrl,
      })
    );
  mount();
  expect(fetcher).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Contract address"), {
    target: { value: address },
  });
  expect(fetcher).not.toHaveBeenCalled();
  await load();
  expect(screen.getByText(review.contractName)).toBeTruthy();
  expect(screen.getByText(review.compilerVersion)).toBeTruthy();
  expect(
    screen
      .getByRole("link", { name: "Destination on Etherscan" })
      .getAttribute("href")
  ).toBe(review.destinationUrl);
  expect(
    screen
      .getByRole("button", { name: "Submit to Etherscan" })
      .hasAttribute("disabled")
  ).toBe(true);
  fireEvent.click(
    screen.getByRole("checkbox", { name: /I confirm public submission/ })
  );
  fireEvent.click(screen.getByRole("button", { name: "Submit to Etherscan" }));
  await screen.findByText("Pending verification");
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body))).toEqual({
    operation: "submit",
    chainId: "1",
    address,
    id: review.id,
    confirmed: true,
  });
  expect(
    screen.queryByRole("button", { name: "Submit to Etherscan" })
  ).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Check status" }));
  await screen.findByText("Verified by Etherscan");
  expect(fetcher).toHaveBeenCalledTimes(3);
  for (const [url, init] of fetcher.mock.calls) {
    expect(url).toBe("/api/verification");
    expect(JSON.stringify(init)).not.toContain(sentinel);
    expect(JSON.stringify(init)).not.toContain("apikey");
    expect(init?.method).toBe("POST");
  }
});
it("input changes discard review/consent and ignore delayed old previews", async () => {
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
  fireEvent.change(screen.getByLabelText("Contract address"), {
    target: { value: address },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Import from Blockscout" })
  );
  fireEvent.change(screen.getByLabelText("Chain"), {
    target: { value: "137" },
  });
  resolve(Response.json(review));
  await waitFor(() =>
    expect(screen.queryByText("Review verification")).toBeNull()
  );
  fireEvent.change(screen.getByLabelText("Chain"), { target: { value: "1" } });
  await load();
  fireEvent.click(
    screen.getByRole("checkbox", { name: /I confirm public submission/ })
  );
  fireEvent.change(screen.getByLabelText("Contract address"), {
    target: { value: "0x22" },
  });
  expect(screen.queryByText("Review verification")).toBeNull();
});
it("uncertain submission retains a checkable handle and never offers an automatic resend", async () => {
  const fetcher = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(Response.json(review))
    .mockRejectedValueOnce(new Error(sentinel))
    .mockResolvedValueOnce(
      Response.json({
        id: review.id,
        state: "pending",
        destinationUrl: review.destinationUrl,
      })
    );
  mount();
  await load();
  fireEvent.click(
    screen.getByRole("checkbox", { name: /I confirm public submission/ })
  );
  fireEvent.click(screen.getByRole("button", { name: "Submit to Etherscan" }));
  await screen.findByText("Delivery uncertain");
  expect(
    screen.queryByRole("button", { name: "Submit to Etherscan" })
  ).toBeNull();
  expect(document.body.textContent).not.toContain(sentinel);
  fireEvent.click(screen.getByRole("button", { name: "Check status" }));
  await screen.findByText("Pending verification");
  expect(fetcher).toHaveBeenCalledTimes(3);
});
it("known server errors use local static messages, not upstream error text", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    Response.json(
      { error: { code: "UNAVAILABLE", message: sentinel } },
      { status: 422 }
    )
  );
  mount();
  fireEvent.change(screen.getByLabelText("Contract address"), {
    target: { value: address },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Import from Blockscout" })
  );
  await screen.findByRole("alert");
  expect(document.body.textContent).not.toContain(sentinel);
});
