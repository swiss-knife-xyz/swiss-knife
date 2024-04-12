import {
  CalldataDecoderRequest,
  calldataDecoderRequestSchema,
} from "@/data/schemas";
import { decodeRecursive } from "@/lib/decoder";
import { stringify } from "viem";

export const POST = async (request: Request) => {
  // validate request body
  let body: CalldataDecoderRequest;
  try {
    const requestBody = await request.json();
    body = calldataDecoderRequestSchema.parse(requestBody);
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Invalid request body",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  const decoded = await decodeRecursive({
    calldata: body.calldata,
    address: body.address,
    chainId: body.chainId,
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
        },
      }
    );
  }

  // we need to use viem's stringify since the result includes a bigint and it is not serializable
  return new Response(stringify(decoded), {
    headers: {
      "Content-Type": "application/json",
    },
  });
};
