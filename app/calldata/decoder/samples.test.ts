import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Interface, id } from "ethers";
import { decoderSamples } from "./samples";

// Captured from public Ethereum RPC, Blockscout, Safe Transaction Service and
// the live decoder. This is test-only data, never a runtime response fallback.
const captured = JSON.parse(
  readFileSync(new URL("./__fixtures__/samples.json", import.meta.url), "utf8")
);
const fixture = (name: string) => captured[name];
const zero = "0x0000000000000000000000000000000000000000";
const media = new Interface([
  "function mint((string tokenURI,string metadataURI,bytes32 contentHash,bytes32 metadataHash) data,((uint256 value) prevOwner,(uint256 value) creator,(uint256 value) owner) bidShares)",
]);
const safe = new Interface([
  "function execTransaction(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,bytes signatures)",
  "event ExecutionSuccess(bytes32 txHash,uint256 payment)",
]);
const multiSend = new Interface(["function multiSend(bytes transactions)"]);
const erc20 = new Interface([
  "function approve(address spender,uint256 value)",
]);
const comet = new Interface(["function supply(address asset,uint256 amount)"]);

function packedCalls(hex: string) {
  let bytes = hex.slice(2);
  const calls: {
    operation: number;
    to: string;
    value: bigint;
    data: string;
  }[] = [];
  while (bytes.length) {
    assert.ok(bytes.length >= 170, "complete MultiSend header");
    const length = Number(BigInt(`0x${bytes.slice(106, 170)}`));
    assert.ok(bytes.length >= 170 + length * 2, "complete MultiSend payload");
    calls.push({
      operation: parseInt(bytes.slice(0, 2), 16),
      to: `0x${bytes.slice(2, 42)}`,
      value: BigInt(`0x${bytes.slice(42, 106)}`),
      data: `0x${bytes.slice(170, 170 + length * 2)}`,
    });
    bytes = bytes.slice(170 + length * 2);
  }
  return calls;
}

test("sample manifest binds exactly two mainnet explorer URLs to verified receipts", () => {
  assert.equal(decoderSamples.length, 2);
  assert.equal(new Set(decoderSamples.map((s) => s.hash)).size, 2);
  for (const [index, name] of ["mint-20000", "safe-supply"].entries()) {
    const sample = decoderSamples[index];
    const d = fixture(name);
    assert.equal(sample.chainId, 1);
    assert.match(sample.hash, /^0x[0-9a-f]{64}$/);
    assert.equal(sample.explorerUrl, `https://etherscan.io/tx/${sample.hash}`);
    assert.equal(d.eth_getTransactionByHash.hash, sample.hash);
    assert.equal(d.eth_getTransactionByHash.chainId, "0x1");
    assert.equal(d.eth_getTransactionReceipt.transactionHash, sample.hash);
    assert.equal(d.eth_getTransactionReceipt.status, "0x1");
    assert.equal(d.blockscout.hash, sample.hash);
    assert.equal(d.blockscout.raw_input, d.eth_getTransactionByHash.input);
  }
});

test("selected mint really mints one token from zero and binds the shown IPFS content", () => {
  const d = fixture("mint-20000");
  const tx = d.eth_getTransactionByHash;
  assert.equal(tx.to, "0xabefbc9fd2f806065b4f3c237d4b59d9a97bcac7");
  const decoded = media.parseTransaction({ data: tx.input })!;
  assert.equal(decoded.name, "mint");
  assert.equal(
    decoded.args.data.tokenURI,
    "ipfs://bafkreiavuiwuq4hkjh743g4j6s6vxk2mvrahwt7iveiblm6h6wuknj4tde"
  );
  assert.equal(
    decoded.args.data.metadataURI,
    "ipfs://bafkreihs5osgaf4pphbesznyj3slixc6qi26rfucwrnz2cvk5jyusthvxi"
  );
  const logs = d.eth_getTransactionReceipt.logs.filter(
    (l: any) =>
      l.address === tx.to &&
      l.topics[0] === id("Transfer(address,address,uint256)")
  );
  assert.equal(logs.length, 1);
  assert.equal(BigInt(logs[0].topics[1]), 0n);
  assert.equal(`0x${logs[0].topics[2].slice(-40)}`, tx.from);
  assert.equal(BigInt(logs[0].topics[3]), 20000n);
  const checks = fixture("content-and-label-checks")["mint-20000"];
  assert.equal(decoded.args.data.contentHash, `0x${checks.artwork.sha256}`);
  assert.equal(decoded.args.data.metadataHash, `0x${checks.metadata.sha256}`);
  const rendered = fixture("mint-20000-render");
  const image = rendered.images.find(
    (image: any) => image.src === checks.artwork.gatewayUrl
  );
  assert.equal(image.width, 500);
  assert.equal(image.height, 544);
  assert.equal(image.complete, true);
});

test("selected Safe executes a successful delegatecall with two understandable inner calls", () => {
  const d = fixture("safe-supply");
  const tx = d.eth_getTransactionByHash;
  assert.equal(tx.to, "0xf5c27c6fe782cbb5c85989ea3e75754748153459");
  const outer = safe.parseTransaction({ data: tx.input })!;
  assert.equal(outer.name, "execTransaction");
  assert.equal(
    outer.args.to.toLowerCase(),
    "0x40a2accbd92bca938b02010e17a5b8929b49130d"
  );
  assert.equal(outer.args.operation, 1n);
  const multi = multiSend.parseTransaction({ data: outer.args.data })!;
  const calls = packedCalls(multi.args.transactions);
  assert.equal(calls.length, 2);
  assert.ok(calls.every((c) => c.operation === 0 && c.value === 0n));
  assert.equal(calls[0].to, "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
  assert.equal(calls[1].to, "0xc3d688b66703497daa19211eedff47f25384cdc3");
  const approval = erc20.parseTransaction({ data: calls[0].data })!;
  assert.equal(approval.args.spender.toLowerCase(), calls[1].to);
  assert.equal(approval.args.value, 2900000000000n);
  const supply = comet.parseTransaction({ data: calls[1].data })!;
  assert.equal(supply.args.asset.toLowerCase(), calls[0].to);
  assert.equal(supply.args.amount, approval.args.value);
  assert.ok(
    d.eth_getTransactionReceipt.logs.some(
      (l: any) =>
        l.address === tx.to &&
        l.topics[0] === id("ExecutionSuccess(bytes32,uint256)")
    )
  );
  const service = fixture("safe-search").results.find(
    (t: any) => t.transactionHash === tx.hash
  );
  assert.equal(service.isExecuted, true);
  assert.equal(service.isSuccessful, true);
  assert.equal(service.data.toLowerCase(), outer.args.data.toLowerCase());
  assert.equal(outer.args.gasToken.toLowerCase(), zero);
});
