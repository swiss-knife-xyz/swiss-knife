import {
  CalldataDecoderRequest,
  calldataDecoderRequestSchema,
} from "@/data/schemas";
import { decodeWithAddress, decodeWithSelector } from "@/lib/decoder";
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

  // determine which function should be used to decode the calldata
  const shouldDecodeWithAddress = !!body.address && !!body.chainId;
  if (shouldDecodeWithAddress) {
    const decoded = await decodeWithAddress({
      calldata: body.calldata,
      // we can enforce that they exists because we're checking above
      address: body.address!,
      chainId: body.chainId!,
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
  }
  const decoded = await decodeWithSelector({ calldata: body.calldata });
  if (!decoded) {
    return new Response(
      JSON.stringify({
        error: "Failed to decode calldata with selector",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
  return new Response(stringify(decoded), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*", // Allows all domains, adjust as necessary
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS", // Adjust based on the methods your server supports
      "Access-Control-Allow-Headers": "Content-Type, Authorization", // Optional, specify the headers allowed in requests
    },
  });
};
