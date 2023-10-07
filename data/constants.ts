import { ZeroAddress, ZeroHash, MaxUint256 } from "ethers";
import { numberToHex } from "viem";

export const constants: {
  label: string;
  data: string;
}[] = [
  {
    label: "Zero Address",
    data: ZeroAddress,
  },
  {
    label: "Max Uint256",
    data: MaxUint256.toString(),
  },
  {
    label: "Max Uint256 (Hex)",
    data: numberToHex(BigInt(MaxUint256)),
  },
  {
    label: "Zero Bytes32",
    data: ZeroHash,
  },
];
