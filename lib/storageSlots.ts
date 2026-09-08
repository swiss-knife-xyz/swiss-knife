import { ethers } from "ethers";

export const EIP1967Options = ["implementation", "admin", "beacon", "rollback"];

export const getEIP1967StorageSlot = (key: string) => {
  const khash = ethers.keccak256(ethers.toUtf8Bytes(`eip1967.proxy.${key}`));
  return BigInt(khash) - BigInt(1);
};

export const getERC7201StorageSlot = (namespaceId: string) => {
  const innerHash = BigInt(ethers.keccak256(ethers.toUtf8Bytes(namespaceId)));
  const encodedSlot = ethers.AbiCoder.defaultAbiCoder().encode(
    ["uint256"],
    [innerHash - BigInt(1)]
  );
  const root = BigInt(ethers.keccak256(encodedSlot)) & ~BigInt(0xff);

  return `0x${root.toString(16).padStart(64, "0")}`;
};

export const normalizeStorageSlot = (slot: string | bigint) => {
  if (typeof slot === "bigint") {
    return `0x${slot.toString(16)}`;
  }

  const trimmedSlot = slot.trim();

  if (trimmedSlot.startsWith("0x")) {
    return trimmedSlot;
  }

  return `0x${BigInt(trimmedSlot).toString(16)}`;
};
