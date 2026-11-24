const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { getMigrationRedirect } = require("../lib/migration/redirect");
const address = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const tx = "0x" + "ab".repeat(32);
const redirect = (url) => getMigrationRedirect(url, { enabled: true });
const marker = "migration=swiss-knife";
const roots = {
  calldata: "https://calldata.eth.sh/decoder",
  converter: "https://converter.eth.sh/eth",
  explorer: "https://eth.sh/explorers",
  transact: "https://tx.eth.sh/",
  foundry: "https://foundry.eth.sh/forge-stack-tracer-ui",
  wallet: "https://wallet.eth.sh/bridge",
  ens: "https://ens.eth.sh/history",
  safe: "https://safe.eth.sh/eip-712-hash",
  solidity: "https://solidity.eth.sh/compiler",
  uniswap: "https://uniswap.eth.sh/tick-to-price",
};

test("redirects are disabled by default", () => {
  assert.equal(getMigrationRedirect("https://swiss-knife.xyz/"), null);
  assert.equal(
    getMigrationRedirect("https://swiss-knife.xyz/", { enabled: false }),
    null
  );
});

test("homepage and www, including HTTP, redirect directly with the marker", () => {
  for (const host of ["swiss-knife.xyz", "www.swiss-knife.xyz"]) {
    for (const scheme of ["http", "https"]) {
      assert.equal(
        redirect(`${scheme}://${host}/`),
        `https://eth.sh/?${marker}`
      );
    }
  }
});

// Derive coverage from the actual preserved application, not only the route table.
function pagePaths(folder = "app") {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(folder, entry.name);
    return entry.isDirectory()
      ? pagePaths(file)
      : entry.name === "page.tsx"
        ? [file]
        : [];
  });
}
for (const file of pagePaths()) {
  const appPath = file.replace(/^app\/?/, "").replace(/\/?page\.tsx$/, "");
  if (
    [
      "github",
      "gitcoin",
      "extension",
      "7702beat/test",
      "explorer/[slug]",
    ].includes(appPath)
  )
    continue;
  const concrete = appPath
    .replace("[address]", address)
    .replace("[chainId]", "8453")
    .replace("[tx]", tx)
    .replace("[ensName]", "vitalik.eth");
  test(`maps legacy public page ${appPath || "/"} on apex and tool hosts`, () => {
    const [tool, ...parts] = concrete.split("/");
    let destination;
    if (!concrete) destination = "https://eth.sh/";
    else if (roots[concrete]) destination = roots[concrete];
    else if (tool === "transact") destination = "https://tx.eth.sh/";
    else if (concrete.startsWith("explorer/contract/"))
      destination = `https://explorer.eth.sh/8453/${address}`;
    else if (concrete.startsWith("explorer/address/"))
      destination = `https://explorer.eth.sh/1/${address}`;
    else if (concrete.startsWith("explorer/tx/"))
      destination = `https://eth.sh/explorers/tx/${tx}`;
    else destination = `https://${tool}.eth.sh/${parts.join("/")}`;
    for (const host of ["swiss-knife.xyz", "www.swiss-knife.xyz"]) {
      assert.equal(
        redirect(`https://${host}/${concrete}`),
        `${destination}?${marker}`
      );
    }
    if (tool)
      assert.equal(
        redirect(`https://${tool}.swiss-knife.xyz/${parts.join("/")}`),
        `${destination}?${marker}`
      );
  });
}

test("preserves original query bytes, duplicate keys, empty fields, encoding, and large values", () => {
  const query =
    "calldata=0xa9059cbb&chainId=8453&eth=0.000000000000000001&wei=9007199254740993123456789&json=%7B%22x%22%3A%22%252B%22%7D&payload=a%2Bb%2Fc%3D%3D&url=https%3A%2F%2Fdapp.test%2F%3Fa%3D1%26b%3Dtwo%2Bwords&tag=one&tag=two&empty=&bare&utf=%E2%9C%A8";
  assert.equal(
    redirect(`https://transact.swiss-knife.xyz/send-tx?${query}`),
    `https://tx.eth.sh/?${query}&${marker}`
  );
});

test("replaces only existing migration markers, including encoded keys", () => {
  assert.equal(
    redirect(
      "https://swiss-knife.xyz/?migration=other&x=1&%6Digration=old&x=2"
    ),
    `https://eth.sh/?x=1&x=2&${marker}`
  );
});

test("uses a supported explicit address chain and preserves query inputs", () => {
  assert.equal(
    redirect(
      `https://explorer.swiss-knife.xyz/address/${address}?chainId=8453&forContracts=true`
    ),
    `https://explorer.eth.sh/8453/${address}?chainId=8453&forContracts=true&${marker}`
  );
});

test("keeps unsupported, empty, invalid, or ambiguous address chains in the directory", () => {
  for (const query of [
    "chainId=999999999999",
    "chainId=",
    "chainId=nope",
    "chainId=8453&chainId=1",
  ]) {
    assert.equal(
      redirect(`https://explorer.swiss-knife.xyz/address/${address}?${query}`),
      `https://eth.sh/explorers/address/${address}?${query}&${marker}`
    );
  }
});

test("unsupported contract chain keeps the path chain as directory filter", () => {
  assert.equal(
    redirect(
      `https://explorer.swiss-knife.xyz/contract/${address}/9999999999999?payload=a%2Bb%3D%3D&chainId=1&tag=one&tag=two`
    ),
    `https://eth.sh/explorers/address/${address}?payload=a%2Bb%3D%3D&tag=one&tag=two&chainId=9999999999999&${marker}`
  );
});

test("keeps ENS address searches functional through the directory", () => {
  for (const name of ["vitalik.eth", "%E2%9C%A8.eth"]) {
    assert.equal(
      redirect(`https://explorer.swiss-knife.xyz/address/${name}`),
      `https://eth.sh/explorers/address/${name}?${marker}`
    );
  }
});

test("Location never supplies a fragment, allowing browsers to inherit the original", () => {
  for (const fragment of [
    "#wall-of-shame",
    "#tools",
    "#sign?messageToSign=hello%20world",
    "#payload=a%2Bb%3D%3D&returnParams=hello",
  ]) {
    const location = redirect(
      `https://wallet.swiss-knife.xyz/signatures?typedDataToSign=%7B%7D${fragment}`
    );
    assert.equal(
      location,
      `https://wallet.eth.sh/signatures?typedDataToSign=%7B%7D&${marker}`
    );
    assert.equal(new URL(location).hash, "");
  }
});

test("normalizes trailing slashes without introducing redirect hops", () => {
  assert.equal(
    redirect("https://calldata.swiss-knife.xyz/decoder/"),
    `https://calldata.eth.sh/decoder?${marker}`
  );
  assert.equal(
    redirect("https://transact.swiss-knife.xyz/send-tx/"),
    `https://tx.eth.sh/?${marker}`
  );
});

test("never redirects destination hosts, previews, spoofed hosts, assets or private routes", () => {
  const inputs = [
    "https://eth.sh/",
    "https://calldata.eth.sh/decoder",
    "https://preview.vercel.app/calldata/decoder",
    "https://swiss-knife.xyz.evil.test/",
    "https://evil.swiss-knife.xyz/",
    "https://x.calldata.swiss-knife.xyz/",
    "https://user:pass@swiss-knife.xyz/",
    "ftp://swiss-knife.xyz/",
    "not a url",
  ];
  for (const input of inputs) assert.equal(redirect(input), null, input);
  for (const host of [
    "swiss-knife.xyz",
    "wallet.swiss-knife.xyz",
    "explorer.swiss-knife.xyz",
  ]) {
    for (const route of [
      "api/source-code",
      "api/facilitator/supported",
      "_storage",
      "_next/static/a.js",
      "robots.txt",
      "sitemap.xml",
      "icon.png",
      "logo.png",
      "favicon.ico",
      "worker/solc.worker.js",
      "not-a-tool",
      "github",
      "extension",
      "gitcoin",
    ]) {
      assert.equal(
        redirect(`https://${host}/${route}`),
        null,
        `${host}/${route}`
      );
    }
  }
  for (const route of [
    "/contract/nope/1",
    "/address/a%2Fb.eth",
    "/address/a%3Fb.eth",
    "/tx/not-a-hash",
    "/unknown",
  ]) {
    assert.equal(
      redirect(`https://explorer.swiss-knife.xyz${route}`),
      null,
      route
    );
  }
  assert.equal(redirect("https://7702beat.swiss-knife.xyz/test"), null);
});

test("does not throw on malformed query escapes", () => {
  assert.equal(
    redirect("https://swiss-knife.xyz/?%ZZ=hello"),
    `https://eth.sh/?%ZZ=hello&${marker}`
  );
});
