import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export const GET = async (
  request: NextRequest,
  { params }: { params: { address: string } }
) => {
  const { address } = params;

  // Extract chainId from query parameters
  const searchParams = request.nextUrl.searchParams;
  const chainIdParam = searchParams.get("chainId");
  const chainId = chainIdParam ? parseInt(chainIdParam) : undefined;

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
      `https://eth-labels-production.up.railway.app/labels/${address}`
    );
    let data = res.data as {
      address: string;
      chainId: number;
      label: string;
      nameTag?: string;
      name?: string;
      symbol?: string;
      website?: string;
      image?: string | null;
    }[];

    // Filter data by chainId if it's provided
    if (chainId !== undefined) {
      data = data.filter((item) => item.chainId === chainId);
    }

    // Extract values in priority order: nameTag, label, symbol, name
    // And remove duplicates
    const uniqueValues = new Set<string>();
    // max limit of 2 unique labels
    const maxLabels = 3;
    const labels: string[] = [];

    // First add all nameTags
    data.forEach((item) => {
      if (item.nameTag && !uniqueValues.has(item.nameTag)) {
        uniqueValues.add(item.nameTag);
        labels.push(item.nameTag);
      }
    });

    // Then add all labels
    data.forEach((item) => {
      if (item.label && !uniqueValues.has(item.label)) {
        uniqueValues.add(item.label);
        labels.push(item.label);
      }
    });

    // Then add all symbols
    data.forEach((item) => {
      if (item.symbol && !uniqueValues.has(item.symbol)) {
        uniqueValues.add(item.symbol);
        labels.push(item.symbol);
      }
    });

    // Finally add all names
    data.forEach((item) => {
      if (item.name && !uniqueValues.has(item.name)) {
        uniqueValues.add(item.name);
        labels.push(item.name);
      }
    });

    // limit to maxLabels
    const finalLabels = labels.slice(0, maxLabels);

    return new Response(JSON.stringify(finalLabels), {
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
