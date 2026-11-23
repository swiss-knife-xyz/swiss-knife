// Server-only: reconstruct verification input from our artifacts and the mined creation transaction.
import { z } from "zod";
import type { Hex } from "viem";
import compilerInput from "../public/mock-tokens-standard-input.json";
import { MOCK_ARTIFACTS, MOCK_COMPILER_VERSION } from "./mockTokens.generated";
import { MOCK_CHAINS } from "./mockTokens";
import type { JobStore } from "./verification/store";
import { VerificationError, type ImportedSource } from "./verification/source";

const schema = z
  .object({
    operation: z.enum(["submit", "status"]),
    chainId: z.number().int(),
    standard: z.enum(["ERC20", "ERC721", "ERC1155"]),
    address: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
    hash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
    retry: z.boolean().optional(),
  })
  .strict();
import {
  EtherscanDeploymentVerification,
  type ChainClient,
} from "./verification/deployment";
export class MockTokenEtherscanVerification extends EtherscanDeploymentVerification {
  constructor(dependencies: {
    key: () => string | undefined;
    store: JobStore;
    client: (chainId: number) => ChainClient;
    fetch?: typeof fetch;
    now?: () => number;
  }) {
    super({
      ...dependencies,
      namespace: "mock",
      parse: (raw) => {
        const parsed = schema.safeParse(raw);
        if (
          !parsed.success ||
          !MOCK_CHAINS.some((chain) => chain.id === parsed.data.chainId)
        )
          throw new VerificationError("INVALID_INPUT");
        return { ...parsed.data, identity: parsed.data.standard };
      },
      source: async (body, rpc): Promise<ImportedSource> => {
        const [transaction, receipt] = await Promise.all([
          rpc.getTransaction({ hash: body.hash as Hex }),
          rpc.getTransactionReceipt({ hash: body.hash as Hex }),
        ]);
        const artifact =
          MOCK_ARTIFACTS[body.identity as keyof typeof MOCK_ARTIFACTS];
        if (
          transaction.to !== null ||
          receipt.status !== "success" ||
          receipt.contractAddress?.toLowerCase() !==
            body.address.toLowerCase() ||
          !transaction.input
            .toLowerCase()
            .startsWith(artifact.bytecode.toLowerCase())
        )
          throw new VerificationError("INVALID_INPUT");
        return {
          contractName: `contracts/mocks/MockTokens.sol:${artifact.contractName}`,
          compilerVersion: `v${MOCK_COMPILER_VERSION}`,
          sourceCode: JSON.stringify(compilerInput),
          constructorArguments: transaction.input.slice(
            artifact.bytecode.length
          ),
          creationTransactionHash: body.hash,
          licenseType: "3",
          files: Object.keys(compilerInput.sources),
          partial: false,
        };
      },
    });
  }
}
