import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import theme from "@/style/theme";
import { MigrationBanner } from "./MigrationBanner";

const route = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));

afterEach(() => {
  cleanup();
  route.pathname = "/";
});

function mount(searchParams = "", onUrlUpdate = vi.fn()) {
  return {
    onUrlUpdate,
    ...render(
      <ChakraProvider theme={theme}>
        <NuqsTestingAdapter
          hasMemory
          searchParams={searchParams}
          onUrlUpdate={onUrlUpdate}
        >
          <MigrationBanner />
          <main>Tool content</main>
        </NuqsTestingAdapter>
      </ChakraProvider>
    ),
  };
}

it.each(["", "?migration=other", "?from=swiss-knife"])(
  "keeps normal visits free of the banner (%s)",
  (query) => {
    mount(query);
    expect(screen.queryByRole("complementary")).toBeNull();
    expect(screen.getByRole("main").textContent).toBe("Tool content");
  }
);

it.each(["/", "/calldata/decoder", "/explorer/1/0x1234", "/faucet"])(
  "shows the migration announcement on %s without changing the URL",
  (pathname) => {
    route.pathname = pathname;
    const { onUrlUpdate } = mount("?migration=swiss-knife");
    expect(
      screen.getByRole("complementary", {
        name: "Swiss Knife migration announcement",
      })
    ).toBeTruthy();
    expect(screen.getByText("Swiss-Knife.xyz is now ETH.sh")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Dismiss migration banner" })
    ).toBeTruthy();
    expect(onUrlUpdate).not.toHaveBeenCalled();
  }
);

it("dismisses and removes only the marker, preserving encoded tool inputs and repeated query fields", async () => {
  const query = new URLSearchParams({
    migration: "swiss-knife",
    calldata: "0x1234",
    chainId: "8453",
    wei: "9007199254740993123456789",
    url: "https://example.com/?a=1&b=two+words#tab",
    payload: "a+b/c==",
  });
  query.append("tag", "one");
  query.append("tag", "two");
  const { onUrlUpdate } = mount(`?${query}`);
  fireEvent.click(
    screen.getByRole("button", { name: "Dismiss migration banner" })
  );
  await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
  const update = onUrlUpdate.mock.lastCall![0];
  expect(update.searchParams.has("migration")).toBe(false);
  query.delete("migration");
  expect([...update.searchParams.entries()]).toEqual([...query.entries()]);
  expect(update.options).toMatchObject({
    history: "replace",
    shallow: true,
    scroll: false,
  });
  expect(screen.queryByRole("complementary")).toBeNull();
});

it("does not render interface elements on the hidden storage hub", () => {
  route.pathname = "/_storage";
  mount("?migration=swiss-knife");
  expect(screen.queryByRole("complementary")).toBeNull();
});
