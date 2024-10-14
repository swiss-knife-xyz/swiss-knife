import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export const GET = async (
  request: NextRequest,
  { params }: { params: { address: string } }
) => {
  const { address } = params;

  if (!address) {
    return new Response(
      JSON.stringify({
        error: "Address not provided",
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
      `https://api-c.walletlabels.xyz/ethereum/label?address=${address}`,
      {
        headers: {
          "x-api-key": process.env.WALLETLABELS_API_KEY,
        },
      }
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
    return new Response(
      JSON.stringify({
        error: "Error fetching data",
        walletLabelsError: error,
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
