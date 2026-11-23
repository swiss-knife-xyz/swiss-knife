import { encodeFunctionData, erc20Abi, parseAbi } from "viem";

export const transactionExamples = [
  {
    label: "Transfer 5 USDC",
    network: "Base",
    chainId: 8453,
    // Native USDC: https://www.circle.com/blog/need-to-know-native-usdc-on-base
    to: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    eth: "0",
    calldata: encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      args: ["0x63A556c75443b176b5A4078e929e38bEb37a1ff2", 5_000_000n],
    }),
  },
  {
    label: "Deposit 0.01 ETH",
    network: "Ethereum · WETH",
    chainId: 1,
    to: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    eth: "0.01",
    calldata: encodeFunctionData({
      abi: parseAbi(["function deposit() payable"]),
      functionName: "deposit",
    }),
  },
] as const;
