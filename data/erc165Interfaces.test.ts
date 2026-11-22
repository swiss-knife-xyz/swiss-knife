import assert from "node:assert/strict";
import { test } from "node:test";
import { id } from "ethers";
import { erc165Interfaces } from "./erc165Interfaces";

// Function sets from the cited standards; inherited ERC-165 selectors and
// optional extensions are deliberately excluded from each base interface ID.
const fixtures = [
  ["0x01ffc9a7", ["supportsInterface(bytes4)"]],
  [
    "0x80ac58cd",
    [
      "balanceOf(address)",
      "ownerOf(uint256)",
      "safeTransferFrom(address,address,uint256,bytes)",
      "safeTransferFrom(address,address,uint256)",
      "transferFrom(address,address,uint256)",
      "approve(address,uint256)",
      "setApprovalForAll(address,bool)",
      "getApproved(uint256)",
      "isApprovedForAll(address,address)",
    ],
  ],
  ["0x5b5e139f", ["name()", "symbol()", "tokenURI(uint256)"]],
  [
    "0x780e9d63",
    [
      "totalSupply()",
      "tokenOfOwnerByIndex(address,uint256)",
      "tokenByIndex(uint256)",
    ],
  ],
  [
    "0xd9b67a26",
    [
      "safeTransferFrom(address,address,uint256,uint256,bytes)",
      "safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)",
      "balanceOf(address,uint256)",
      "balanceOfBatch(address[],uint256[])",
      "setApprovalForAll(address,bool)",
      "isApprovedForAll(address,address)",
    ],
  ],
  ["0x0e89341c", ["uri(uint256)"]],
  ["0x2a55205a", ["royaltyInfo(uint256,uint256)"]],
] as const;

test("every curated ID equals the XOR of its standard's own function selectors", () => {
  assert.equal(erc165Interfaces.length, fixtures.length);
  assert.equal(
    new Set(erc165Interfaces.map((entry) => entry.id)).size,
    fixtures.length
  );
  for (const [expected, signatures] of fixtures) {
    const actual = signatures.reduce(
      (value, signature) => value ^ BigInt(id(signature).slice(0, 10)),
      0n
    );
    assert.equal(`0x${actual.toString(16).padStart(8, "0")}`, expected);
    const entry = erc165Interfaces.find((entry) => entry.id === expected);
    assert.ok(entry, expected);
    assert.match(
      entry.source,
      /^https:\/\/eips\.ethereum\.org\/EIPS\/eip-(165|721|1155|2981)(#.*)?$/
    );
  }
});

test("does not fabricate IDs for ERC-20 or include the invalid sentinel", () => {
  assert.equal(
    erc165Interfaces.some((entry) => /^ERC-20\b/.test(entry.label)),
    false
  );
  assert.equal(
    erc165Interfaces.some((entry) => String(entry.id) === "0xffffffff"),
    false
  );
});
