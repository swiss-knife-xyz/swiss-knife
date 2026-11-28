import type { TraceCall } from "./model";

// Ethereum precompile addresses (including Cancun and Prague additions).
// Their native inputs do not use Solidity function selectors.
const precompiles = [
  "ecRecover", "sha256", "ripemd160", "identity", "modexp",
  "ecAdd", "ecMul", "ecPairing", "blake2f", "pointEvaluation",
  "bls12G1Add", "bls12G1Msm", "bls12G2Add", "bls12G2Msm",
  "bls12Pairing", "bls12MapFpToG1", "bls12MapFp2ToG2",
];

export function tracePrecompile(call: TraceCall): string | undefined {
  if (!["CALL", "STATICCALL", "DELEGATECALL", "CALLCODE"].includes(call.type) ||
      !call.to || !/^0x0{38}[\da-f]{2}$/i.test(call.to)) return;
  return precompiles[Number.parseInt(call.to.slice(-2), 16) - 1];
}
