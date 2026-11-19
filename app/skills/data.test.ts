import assert from "node:assert/strict";
import test from "node:test";
import { aiToolTypeOrder, categoryOrder, skillResources } from "./data";

test("StalkChain research listing uses the directory profile and discloses account effects", () => {
  const resource = skillResources.find(
    ({ id }) => id === "stalkchain-data-mcp"
  );
  assert(resource, "StalkChain Data must be listed");
  assert.equal(resource.url, "https://stalkchain.com/mcp");
  assert.equal(resource.install, "https://data.stalkchain.com/mcp/directory");
  assert.deepEqual(resource.toolTypes, ["MCP"]);
  assert.deepEqual(resource.categories, ["Data", "Wallet", "Cross-chain"]);
  assert.match(resource.description, /OAuth/);
  assert.match(resource.description, /metered.*credits/i);
  assert.match(resource.description, /coverage varies by tool/i);
  assert.match(resource.description, /alerts changes account state/i);
  assert.doesNotMatch(
    resource.description,
    /read-only|cannot sign|cannot.*trade/i
  );
});

test("Namera listing distinguishes skill installation from authorized local wallet tools", () => {
  const resource = skillResources.find(({ id }) => id === "namera-skills");
  assert(resource, "Namera Skills must be listed");
  assert.equal(
    resource.url,
    "https://github.com/thenamespace/namera/tree/main/skills/namera"
  );
  assert.equal(
    resource.install,
    "npx skills add thenamespace/namera --skill namera --yes"
  );
  assert.deepEqual(resource.toolTypes, ["Skill", "MCP", "CLI", "API"]);
  assert.deepEqual(resource.categories, [
    "Wallet",
    "Developer",
    "Infrastructure",
  ]);
  assert.match(resource.description, /open-beta/i);
  assert.match(resource.description, /local stdio MCP/);
  assert.match(resource.description, /spending limits/);
  assert.match(resource.description, /gas sponsorship.*subject to.*limits/i);
  assert.match(
    resource.description,
    /separate.*CLI installation.*browser authorization/i
  );
});

test("skill catalog identities, classifications and evidence URLs are valid", () => {
  const ids = new Set<string>();
  for (const resource of skillResources) {
    assert(!ids.has(resource.id), `Duplicate resource: ${resource.id}`);
    ids.add(resource.id);
    assert(resource.name.trim());
    assert(resource.provider.trim());
    assert.equal(new URL(resource.url).protocol, "https:");
    assert(resource.toolTypes.length > 0);
    assert(resource.toolTypes.every((type) => aiToolTypeOrder.includes(type)));
    assert(resource.categories.length > 0);
    assert(
      resource.categories.every((category) => categoryOrder.includes(category))
    );
    assert(resource.tags.length > 0);
    assert.equal(new Set(resource.tags).size, resource.tags.length);
    assert(resource.sourceUrls.length > 0, `Missing evidence: ${resource.id}`);
    for (const url of resource.sourceUrls) {
      assert.equal(new URL(url).protocol, "https:");
    }
  }
});
