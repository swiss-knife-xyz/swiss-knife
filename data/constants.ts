import { ZeroAddress, ZeroHash, MaxUint256 } from "ethers";
import {
  maxUint16,
  maxUint160,
  maxUint24,
  maxUint32,
  maxUint40,
  maxUint48,
  maxUint64,
  maxUint8,
  maxUint96,
  numberToHex,
} from "viem";

// TODO: have dropdown for selecting between various uint datatypes
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
  {
    label: "Max Uint8",
    data: maxUint8.toString(),
  },
  {
    label: "Max Uint16",
    data: maxUint16.toString(),
  },
  {
    label: "Max Uint24",
    data: maxUint24.toString(),
  },
  {
    label: "Max Uint32",
    data: maxUint32.toString(),
  },
  {
    label: "Max Uint40",
    data: maxUint40.toString(),
  },
  {
    label: "Max Uint48",
    data: maxUint48.toString(),
  },
  {
    label: "Max Uint64",
    data: maxUint64.toString(),
  },
  {
    label: "Max Uint96",
    data: maxUint96.toString(),
  },
  {
    label: "Max Uint160",
    data: maxUint160.toString(),
  },
];
