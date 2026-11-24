import { createHash } from "node:crypto";
import { z } from "zod";
import type { Hex } from "viem";
import {
  EtherscanDeploymentVerification,
  type ChainClient,
  type DeploymentVerificationRequest,
} from "@/lib/verification/deployment";
import { normalizeInput } from "@/lib/verification/normalize";
import { VerificationError } from "@/lib/verification/source";
import type { JobStore } from "@/lib/verification/store";
import { verificationIdentity } from "./verificationInput";
const sourceSchema = z
  .object({
    contractName: z.string().max(1024),
    compilerVersion: z.string().max(80),
    sourceCode: z.string().max(1_100_000),
    constructorArguments: z.string().max(131074),
    licenseType: z.string(),
    files: z.array(z.string()).max(200),
    partial: z.literal(false),
    creationTransactionHash: z.string().optional(),
  })
  .strict();
const schema = z
  .object({
    operation: z.enum(["submit", "status"]),
    chainId: z.number().int().positive(),
    address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    hash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
    sourceId: z.string().regex(/^[a-f0-9]{64}$/),
    retry: z.boolean().optional(),
    source: sourceSchema.optional(),
    bytecode: z
      .string()
      .regex(/^(?:[a-fA-F0-9]{2})+$/)
      .max(262144)
      .optional(),
  })
  .strict();
export class CompilerDeploymentVerification extends EtherscanDeploymentVerification {
  constructor(dependencies: {
    key: () => string | undefined;
    store: JobStore;
    client: (chainId: number) => ChainClient;
    fetch?: typeof fetch;
    now?: () => number;
  }) {
    super({
      ...dependencies,
      namespace: "compiler",
      bodyLimit: 2_500_000,
      parse: (raw) => {
        const parsed = schema.safeParse(raw);
        if (!parsed.success) throw new VerificationError("INVALID_INPUT");
        const body = parsed.data;
        const request: DeploymentVerificationRequest = {
          ...body,
          identity: body.sourceId,
          source: undefined,
        };
        if (body.operation === "submit") {
          if (!body.source || !body.bytecode)
            throw new VerificationError("INVALID_INPUT");
          let input: unknown;
          try {
            input = JSON.parse(body.source.sourceCode);
          } catch {
            throw new VerificationError("INVALID_INPUT");
          }
          const source = normalizeInput(
            input,
            body.source.contractName,
            body.source.compilerVersion,
            body.source.constructorArguments,
            body.source.licenseType
          );
          const id = createHash("sha256")
            .update(verificationIdentity(source, body.bytecode))
            .digest("hex");
          if (
            id !== body.sourceId ||
            (body.source.creationTransactionHash &&
              body.source.creationTransactionHash.toLowerCase() !==
                body.hash.toLowerCase())
          )
            throw new VerificationError("INVALID_INPUT");
          request.source = { ...source, creationTransactionHash: body.hash };
        } else if (body.source || body.bytecode || body.retry)
          throw new VerificationError("INVALID_INPUT");
        return request;
      },
      source: async (body, rpc) => {
        if (!body.source || !body.bytecode)
          throw new VerificationError("INVALID_INPUT");
        const [tx, receipt] = await Promise.all([
          rpc.getTransaction({ hash: body.hash as Hex }),
          rpc.getTransactionReceipt({ hash: body.hash as Hex }),
        ]);
        const expected =
          `0x${body.bytecode}${body.source.constructorArguments}`.toLowerCase();
        if (
          tx.to !== null ||
          receipt.status !== "success" ||
          receipt.contractAddress?.toLowerCase() !==
            body.address.toLowerCase() ||
          tx.input.toLowerCase() !== expected
        )
          throw new VerificationError("SOURCE_MISMATCH");
        return body.source;
      },
    });
  }
}
