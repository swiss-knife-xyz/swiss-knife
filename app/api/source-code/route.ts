import axios from "axios";
import { sourceCodeRequestSchema } from "@/data/schemas";

export const OPTIONS = async (request: Request) => {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*", // Allows all domains, adjust as necessary
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS", // Adjust based on the methods your server supports
      "Access-Control-Allow-Headers": "Content-Type, Authorization", // Optional, specify the headers allowed in requests
    },
  });
};

export const GET = async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  const chainId = searchParams.get("chainId");

  // validate parameters
  try {
    sourceCodeRequestSchema.parse({
      address,
      chainId: parseInt(chainId || ""),
    });
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

  try {
    const res = await axios.get(
      `https://api.etherscan.io/v2/api?apikey=${process.env.ETHERSCAN_API_KEY}&chainid=${chainId}&module=contract&action=getsourcecode&address=${address}`
    );
    return new Response(JSON.stringify(res.data), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // Allows all domains, adjust as necessary
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS", // Adjust based on the methods your server supports
        "Access-Control-Allow-Headers": "Content-Type, Authorization", // Optional, specify the headers allowed in requests
      },
    });
  } catch (error) {
    console.log(error);
    return new Response(
      JSON.stringify({
        error: "Error fetching data",
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
};
