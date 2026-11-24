import assert from "node:assert/strict";
import test from "node:test";
import contentHash from "content-hash";
import { parseContenthash, shortenContenthash } from "./contenthash";

const ipfs =
  "0xe30101701220adbee9ad34d5e60cf6a77a82ad98bcc8cdb88f9372b3f95f019d7a1083ee8327";
const ipns =
  "0xe5010172002408011220bfcb6eee63f7913b92eb3ff7dfe22243c3b08ecbeae1a5b3abe0d5eb770d52e6";

test("ens.eth IPFS record retains the current CID and gateway", () => {
  const record = parseContenthash(ipfs)!;
  assert.equal(
    record.value,
    "bafybeifnx3u22ngv4ygpnj32qkwzrpgizw4i7e3swp4v6am5piiih3ude4"
  );
  assert.equal(record.raw, ipfs);
  assert.equal(record.protocol, "ipfs");
  assert.equal(
    record.gatewayUrl,
    `https://${record.value}.ipfs.inbrowser.link`
  );
  assert.equal(shortenContenthash(record), "ipfs://bafybeifnx...ude4");
});

test("tankdefender.eth IPNS record is visible without an IPFS gateway", () => {
  const record = parseContenthash(ipns)!;
  assert.equal(record.protocol, "ipns");
  assert.equal(
    record.value,
    "12D3KooWNj3xS5Q1LeXYjNRHpykpbUiefAEK4QsyuefrzQy7p9u7"
  );
  assert.equal(record.display, `ipns://${record.value}`);
  assert.equal(record.gatewayUrl, undefined);
  assert.match(shortenContenthash(record), /^ipns:\/\//);
});

test("Swarm and Onion use their own protocols without IPFS links", () => {
  const swarmHash =
    "d1de9994b4d039f6548d191eb26786769f580809256b4685ef316805265ea162";
  const swarm = parseContenthash(
    `0x${contentHash.encode("swarm-ns", swarmHash)}`
  )!;
  assert.equal(swarm.display, `bzz://${swarmHash}`);
  assert.equal(swarm.gatewayUrl, undefined);
  const onion = parseContenthash(
    `0x${contentHash.encode("onion", "abcdefghijklmnop")}`
  )!;
  assert.equal(onion.display, "onion://abcdefghijklmnop");
  assert.equal(onion.gatewayUrl, undefined);
});

test("unsupported and malformed nonempty hashes remain visible; only empty records clear", () => {
  for (const raw of ["0x0100", "0xe301", "0xzz", "0x00000000"]) {
    const record = parseContenthash(raw)!;
    assert.equal(record.display, raw);
    assert.equal(record.raw, raw);
    assert.equal(record.gatewayUrl, undefined);
  }
  assert.equal(parseContenthash("0x"), null);
  assert.equal(parseContenthash(null), null);
  assert.equal(parseContenthash(undefined), null);
});
