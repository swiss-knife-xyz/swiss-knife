import { Interface } from "ethers";
import type { TraceAbis } from "./decode";
import { normalizeTrace } from "./model";

const tokenAbi = [
  "function balanceOf(address owner) view returns (uint256 balance)",
  "function transfer(address to, uint256 amount) returns (bool success)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "error InsufficientBalance(uint256 available, uint256 requested)",
];
const token = new Interface(tokenAbi);
export const demoAbis: TraceAbis = {
  [`0x${"33".repeat(20)}`]: tokenAbi,
  [`0x${"44".repeat(20)}`]: tokenAbi,
};
/** Synthetic example: a router catches a failed child call and completes. */
export const demoTrace = normalizeTrace({
  type: "CALL",
  from: `0x${"11".repeat(20)}`,
  to: `0x${"22".repeat(20)}`,
  input: "0x",
  output: "0x",
  gas: "0x30d40",
  gasUsed: "0x12345",
  value: "0x0",
  calls: [
    {
      type: "STATICCALL",
      from: `0x${"22".repeat(20)}`,
      to: `0x${"33".repeat(20)}`,
      input: `0x70a08231${"0".repeat(24)}${"22".repeat(20)}`,
      output: `0x${"0".repeat(63)}1`,
      gasUsed: "0xa28",
    },
    {
      type: "CALL",
      from: `0x${"22".repeat(20)}`,
      to: `0x${"44".repeat(20)}`,
      input: token.encodeFunctionData("transfer", [`0x${"11".repeat(20)}`, 2n]),
      output: token.encodeErrorResult("InsufficientBalance", [1n, 2n]),
      gasUsed: "0x1388",
      error: "execution reverted",
    },
    {
      type: "CALL",
      from: `0x${"22".repeat(20)}`,
      to: `0x${"33".repeat(20)}`,
      input: `0xa9059cbb${"0".repeat(24)}${"11".repeat(20)}${"0".repeat(63)}1`,
      output: `0x${"0".repeat(63)}1`,
      gasUsed: "0x7530",
      logs: [
        {
          address: `0x${"33".repeat(20)}`,
          ...token.encodeEventLog(token.getEvent("Transfer")!, [
            `0x${"22".repeat(20)}`,
            `0x${"11".repeat(20)}`,
            1n,
          ]),
          position: 0,
        },
      ],
    },
  ],
});
