import assert from "node:assert/strict";
import test from "node:test";
import { readNativeUsdPrice } from "./gasCostPrice";

const eth = {
  id: 1,
  name: "Ethereum",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
};
const now = () => 1800000000000;
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

test("fetches a chain-identity-mapped native asset, never guesses from a symbol", async () => {
  const urls: string[] = [];
  const fetcher: typeof fetch = async (url) => {
    urls.push(String(url));
    return response({ ethereum: { usd: 3000, last_updated_at: 1800000000 } });
  };
  assert.equal(await readNativeUsdPrice(eth, fetcher, now), 3000);
  assert.match(
    urls[0],
    /api.coingecko.com\/api\/v3\/simple\/price\?ids=ethereum&vs_currencies=usd&include_last_updated_at=true$/
  );
  assert.equal(
    await readNativeUsdPrice({ ...eth, id: 9999999 }, fetcher, now),
    undefined
  );
  assert.equal(
    await readNativeUsdPrice({ ...eth, testnet: true }, fetcher, now),
    undefined
  );
  assert.equal(urls.length, 1);
});

test("non-ETH native assets use their own feed", async () => {
  assert.equal(
    await readNativeUsdPrice(
      {
        ...eth,
        id: 137,
        nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
      },
      async (url) => {
        assert.match(String(url), /ids=polygon-ecosystem-token&/);
        return response({
          "polygon-ecosystem-token": { usd: 0.5, last_updated_at: 1800000000 },
        });
      },
      now
    ),
    0.5
  );
});

test("rate limits, missing, invalid, stale or future prices return unavailable", async () => {
  for (const body of [
    null,
    {},
    { ethereum: {} },
    ...[0, -1, "3000", null].map((usd) => ({
      ethereum: { usd, last_updated_at: 1800000000 },
    })),
    { ethereum: { usd: 3000 } },
    { ethereum: { usd: 3000, last_updated_at: 1799999000 } },
    { ethereum: { usd: 3000, last_updated_at: 1800000100 } },
  ]) {
    assert.equal(
      await readNativeUsdPrice(eth, async () => response(body), now),
      undefined
    );
  }
  assert.equal(
    await readNativeUsdPrice(eth, async () => response({}, 429), now),
    undefined
  );
  assert.equal(
    await readNativeUsdPrice(
      eth,
      async () => {
        throw Error("timeout");
      },
      now
    ),
    undefined
  );
  assert.equal(
    await readNativeUsdPrice(
      eth,
      async () => new Response("invalid JSON"),
      now
    ),
    undefined
  );
});
