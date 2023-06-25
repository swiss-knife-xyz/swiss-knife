import { ZeroAddress, ZeroHash, MaxUint256 } from "ethers";

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
    label: "Zero Bytes32",
    data: ZeroHash,
  },
];
