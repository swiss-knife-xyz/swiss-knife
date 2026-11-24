import { expect, it } from "vitest";
import { CID } from "multiformats/cid";
import { base36 } from "multiformats/bases/base36";
import { IPFS_EXAMPLES, ipfsContentUrl, parseIPFSInput } from "./input";
import { PUBLIC_IPFS_GATEWAYS } from "@/lib/ipfs";

const cid = IPFS_EXAMPLES[0].value;
const v0 = "QmdfTbBqBPQ7VNxZEYEj14VmRuZBkqFbiwReogJgS1zR1n";

it.each([
  cid,
  `ipfs://${cid}`,
  `IPFS://${cid}`,
  `ipfs://ipfs/${cid}`,
  `/ipfs/${cid}`,
  ` https://example.com/ipfs/${cid} `,
  `https://${cid}.ipfs.dweb.link`,
  `gateway.example/ipfs/${cid}`,
])("extracts a CID from %s", (input) => {
  expect(parseIPFSInput(input)?.cid).toBe(cid);
});

it("supports CIDv0 and base36 CIDv1", () => {
  expect(parseIPFSInput(v0)).toEqual({ cid: v0, suffix: "" });
  const base36Cid = CID.parse(cid).toString(base36);
  expect(parseIPFSInput(base36Cid)?.cid).toBe(cid);
});

it.each([
  `${cid}/folder/file%20name.json?download=true#section`,
  `ipfs://${cid}/folder/file%20name.json?download=true#section`,
  `https://example.com/ipfs/${cid}/folder/file%20name.json?download=true#section`,
  `https://${cid}.ipfs.example.com/folder/file%20name.json?download=true#section`,
])("preserves paths, query parameters and fragments from %s", (input) => {
  const content = parseIPFSInput(input)!;
  expect(content.suffix).toBe("/folder/file%20name.json?download=true#section");
  for (const gateway of PUBLIC_IPFS_GATEWAYS)
    expect(ipfsContentUrl(gateway.url, content)).toBe(
      `${gateway.url}${cid}${content.suffix}`
    );
});

it.each([
  "",
  "not-a-cid",
  "bafybroken",
  "https://example.com",
  "javascript:alert(1)",
  `https://example.com/ipns/${cid}`,
  `${cid}/../other`,
  `${cid}/%2e%2e/other`,
  `${cid}\\other`,
])("rejects invalid content %s", (value) => {
  expect(parseIPFSInput(value)).toBeNull();
});

it("keeps both examples valid", () => {
  for (const example of IPFS_EXAMPLES)
    expect(parseIPFSInput(example.value)).not.toBeNull();
});
