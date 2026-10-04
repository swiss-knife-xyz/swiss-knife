import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import subdomains from "../subdomains";
import sitemap from "../app/sitemap";

test("homepage preserves the tool grid without invented SEO copy", () => {
  const source = readFileSync("app/page.tsx", "utf8");
  assert.doesNotMatch(source, /Swiss Knife — Ethereum developer tools/);
  assert.match(source, /<SimpleGrid\s/);
});

test("static layout social images refer to existing files", () => {
  const layouts = readdirSync("app", { recursive: true }).filter((name) =>
    String(name).endsWith("layout.tsx")
  );
  for (const name of layouts) {
    const source = readFileSync(`app/${name}`, "utf8");
    for (const match of source.matchAll(
      /https:\/\/swiss-knife\.xyz(\/og\/[^"'`\s]*)/g
    )) {
      assert.ok(
        existsSync(`public${match[1]}`) && !match[1].endsWith("/"),
        `${name}: missing image ${match[1]}`
      );
    }
  }
});

test("sitemap includes the legacy homepage and only concrete non-redirect tool pages", () => {
  const entries = sitemap();
  assert.ok(
    entries.some(({ url }) => url === "https://swiss-knife.xyz/"),
    "legacy homepage missing"
  );
  assert.equal(new Set(entries.map(({ url }) => url)).size, entries.length);
  for (const { url } of entries) {
    const parsed = new URL(url);
    assert.equal(parsed.protocol, "https:");
    const base =
      parsed.hostname === "swiss-knife.xyz"
        ? ""
        : parsed.hostname.replace(".swiss-knife.xyz", "");
    const file =
      `app/${[base, parsed.pathname.slice(1)].filter(Boolean).join("/")}/page.tsx`.replace(
        "//",
        "/"
      );
    assert.ok(existsSync(file), `${url} lacks a concrete page`);
    const source = readFileSync(file, "utf8");
    const clientRedirectOnly =
      source.includes("router.push(") && source.includes("return <></>");
    assert.ok(
      !clientRedirectOnly && !source.includes("import { redirect }"),
      `${url} is a redirect-only page`
    );
  }
});

test("navigation paths resolve to concrete tool pages, not dynamic placeholders", () => {
  for (const { base, paths } of Object.values(subdomains)) {
    for (const path of paths) {
      assert.ok(
        existsSync(`app/${base}/${path}/page.tsx`),
        `${base}/${path} has no concrete tool page`
      );
    }
  }
});

test("navigation exposes the existing CCIP and Viem error tools", () => {
  assert.ok(
    subdomains.ENS.paths.includes("ccip"),
    "ENS CCIP missing from navigation"
  );
  assert.ok(
    subdomains.CALLDATA.paths.includes("viem-error-simulate"),
    "Viem error tool missing from navigation"
  );
});
