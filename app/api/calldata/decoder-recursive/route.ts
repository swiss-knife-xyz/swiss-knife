import { c } from "@/data/common";
import {
  CalldataDecoderRecursiveRequest,
  calldataDecoderRecursiveRequestSchema,
} from "@/data/schemas";
import { decodeRecursive } from "@/lib/decoder";
import { Chain, Hex, createPublicClient, http, stringify } from "viem";

export const OPTIONS = async (request: Request) => {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*", // Allows all domains, adjust as necessary
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS", // Adjust based on the methods your server supports
      "Access-Control-Allow-Headers": "Content-Type, Authorization", // Optional, specify the headers allowed in requests
    },
  });
};

export const POST = async (request: Request) => {
  // validate request body
  let body: CalldataDecoderRecursiveRequest;
  try {
    const requestBody = await request.json();
    body = calldataDecoderRecursiveRequestSchema.parse(requestBody);
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Invalid request body",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*", // Allows all domains, adjust as necessary
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS", // Adjust based on the methods your server supports
          "Access-Control-Allow-Headers": "Content-Type, Authorization", // Optional, specify the headers allowed in requests
        },
      }
    );
  }

  let calldata = body.calldata;
  let address = body.address;
  let chainId = body.chainId;
  let tx = body.tx;

  let chain: Chain | undefined;

  try {
    if (tx) {
      let txHash: string;
      if (/^0x([A-Fa-f0-9]{64})$/.test(tx)) {
        txHash = tx;

        if (!chainId) {
          // if tx hash is provided, but chainId is not, then show select network
          throw new Error(
            "chainId is required when transaction hash is provided"
          );
        }
      } else {
        txHash = tx.split("/").pop()!;

        const chainKey = Object.keys(c).filter((chainKey) => {
          const chain = c[chainKey as keyof typeof c] as Chain;

          // using "null" instead of "" because __fromTxInput.split("/") contains ""
          let explorerDomainDefault = "null";
          let explorerDomainEtherscan = "null";
          if (chain.blockExplorers) {
            explorerDomainDefault = chain.blockExplorers.default.url
              .split("//")
              .pop()!;

            if (chain.blockExplorers.etherscan) {
              explorerDomainEtherscan = chain.blockExplorers.etherscan.url
                .split("//")
                .pop()!;
            }
          }

          return (
            tx!
              .split("/")
              .filter(
                (urlPart) =>
                  urlPart.toLowerCase() ===
                    explorerDomainDefault.toLowerCase() ||
                  urlPart.toLowerCase() ===
                    explorerDomainEtherscan.toLowerCase()
              ).length > 0
          );
        })[0];
        chain = c[chainKey as keyof typeof c];
      }

      const publicClient = createPublicClient({
        chain,
        transport: http(),
      });
      const transaction = await publicClient.getTransaction({
        hash: txHash as Hex,
      });

      calldata = transaction.input;
      address = transaction.to!;
      chainId = chain ? chain.id : undefined;
    } else if (!calldata) {
      throw new Error("calldata or tx is required");
    }
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*", // Allows all domains, adjust as necessary
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS", // Adjust based on the methods your server supports
          "Access-Control-Allow-Headers": "Content-Type, Authorization", // Optional, specify the headers allowed in requests
        },
      }
    );
  }

  const decoded = await decodeRecursive({
    calldata,
    address,
    chainId,
  });

  if (!decoded) {
    return new Response(
      JSON.stringify({
        error: "Failed to decode calldata with ABI for contract",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*", // Allows all domains, adjust as necessary
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS", // Adjust based on the methods your server supports
          "Access-Control-Allow-Headers": "Content-Type, Authorization", // Optional, specify the headers allowed in requests
        },
      }
    );
  }

  // we need to use viem's stringify since the result includes a bigint and it is not serializable
  return new Response(stringify(decoded), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*", // Allows all domains, adjust as necessary
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS", // Adjust based on the methods your server supports
      "Access-Control-Allow-Headers": "Content-Type, Authorization", // Optional, specify the headers allowed in requests
    },
  });
};
