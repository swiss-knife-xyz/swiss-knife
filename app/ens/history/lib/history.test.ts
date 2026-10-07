import assert from "node:assert/strict";
import test from "node:test";
import { namehash } from "viem/ens";
import {
  decodeEnsRouteName,
  normalizeEnsInput,
  fetchIndexedEvents,
  eventSummary,
  type IndexedEvent,
} from "./history";

test("emoji and Unicode route segments normalize to the same ENS node", () => {
  for (const name of ["🐙puppy.eth", "👨‍👩‍👧‍👦.eth", "école.eth"]) {
    assert.equal(
      normalizeEnsInput(encodeURIComponent(name)),
      normalizeEnsInput(name)
    );
    assert.equal(
      namehash(normalizeEnsInput(encodeURIComponent(name))),
      namehash(normalizeEnsInput(name))
    );
  }
  assert.equal(normalizeEnsInput("  VITALIK.ETH "), "vitalik.eth");
});

test("malformed escapes stay readable and invalid names are rejected", () => {
  assert.equal(decodeEnsRouteName("%ZZ.eth"), "%ZZ.eth");
  assert.equal(decodeEnsRouteName("%25F0.eth"), "%F0.eth");
  assert.throws(() => normalizeEnsInput("%ZZ.eth"));
  assert.throws(() => normalizeEnsInput(""));
});

test("pagination retains old registry interactions and more than 100 results", async () => {
  const events: IndexedEvent[] = Array.from({ length: 205 }, (_, index) => ({
    id: String(index).padStart(4, "0"),
    __typename: "Transfer",
    blockNumber: index + 3725362,
    transactionID: `0x${index}`,
  }));
  const seen: string[] = [];
  const result = await fetchIndexedEvents(
    "query",
    "domainEvents",
    "node",
    async (_, variables) => {
      assert.equal(variables.node, "node");
      seen.push(String(variables.cursor));
      return {
        domainEvents: events
          .filter((event) => event.id > String(variables.cursor))
          .slice(0, Number(variables.first)),
      };
    },
    100
  );
  assert.deepEqual(result, events);
  assert.deepEqual(seen, ["", "0099", "0199"]);
});

test("pagination failure cannot masquerade as complete history", async () => {
  const event: IndexedEvent = {
    id: "same",
    __typename: "Transfer",
    blockNumber: 1,
    transactionID: "0x1",
  };
  await assert.rejects(
    fetchIndexedEvents(
      "query",
      "domainEvents",
      "node",
      async () => ({ domainEvents: [event] }),
      1
    ),
    /did not advance/
  );
  await assert.rejects(
    fetchIndexedEvents("query", "resolverEvents", "node", async () => ({})),
    /Missing ENS/
  );
});

test("old text events distinguish an unindexed value from an explicitly cleared value", () => {
  const event: IndexedEvent = {
    id: "1",
    __typename: "TextChanged",
    blockNumber: 1,
    transactionID: "0x1",
    key: "avatar",
    value: null,
  };
  assert.equal(eventSummary(event), "avatar: value not indexed");
  assert.equal(eventSummary({ ...event, value: "" }), "avatar: ");
});
