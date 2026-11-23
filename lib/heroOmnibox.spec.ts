import { expect, it } from "vitest";
import { detectOmniboxInput } from "./heroOmnibox";

const address = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const hash = `0x${"ab".repeat(32)}`;

it("prefers contract addresses and resolves chain-prefixed or explorer addresses", () => {
  expect(detectOmniboxInput(` ${address} `)).toEqual({
    kind: "address",
    value: address,
    chainId: 1,
  });
  expect(detectOmniboxInput(`base:${address}`)).toEqual({
    kind: "address",
    value: address,
    chainId: 8453,
  });
  expect(
    detectOmniboxInput(`https://basescan.org/address/${address}#code`)
  ).toEqual({ kind: "address", value: address, chainId: 8453 });
  expect(detectOmniboxInput(`etherscan.io/token/${address}?a=1`)).toEqual({
    kind: "address",
    value: address,
    chainId: 1,
  });
});

it("prefers transactions for 32 bytes and derives their chain from explorer links", () => {
  expect(detectOmniboxInput(hash)).toEqual({
    kind: "transaction",
    value: hash,
    chainId: 1,
  });
  expect(
    detectOmniboxInput(`https://basescan.org/tx/${hash}?foo=bar#eventlog`)
  ).toEqual({ kind: "transaction", value: hash, chainId: 8453 });
});

it("recognizes complete hex bytes and keeps integer precision and sign", () => {
  expect(detectOmniboxInput("0x18160ddd")).toEqual({
    kind: "calldata",
    value: "0x18160ddd",
  });
  expect(detectOmniboxInput("0X1234")).toEqual({
    kind: "calldata",
    value: "0x1234",
  });
  for (const value of [
    "0",
    "-1",
    (2n ** 256n - 1n).toString(),
    (-(2n ** 255n)).toString(),
  ]) {
    expect(detectOmniboxInput(value)).toEqual({ kind: "integer", value });
  }
  expect(detectOmniboxInput("+000123")).toEqual({
    kind: "integer",
    value: "123",
  });
});

it("rejects partial bytes, unknown or spoofed URLs and unsupported input", () => {
  for (const value of [
    "",
    " ",
    "0x",
    "0x123",
    "0xzz",
    "1.5",
    "1e18",
    "hello",
    `https://etherscan.io.evil.com/address/${address}`,
    `https://user:secret@etherscan.io/address/${address}`,
    `javascript:alert(1)`,
    "https://etherscan.io/",
  ]) {
    expect(detectOmniboxInput(value)).toBeNull();
  }
});

it("recognizes and normalizes supported names and nested subdomains", () => {
  for (const value of [
    "vitalik.eth",
    "sub.vitalik.eth",
    "alice.gwei",
    "sub.alice.gwei",
    "alice.wei",
    "sub.alice.wei",
  ]) {
    expect(detectOmniboxInput(value)).toEqual({ kind: "name", value });
  }
  expect(detectOmniboxInput("  VITALIK.ETH ")).toEqual({
    kind: "name",
    value: "vitalik.eth",
  });
  for (const value of [
    "alice..eth",
    "bad name.eth",
    "https://alice.eth",
    "alice.example",
  ]) {
    expect(detectOmniboxInput(value)).toBeNull();
  }
});
