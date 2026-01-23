import { NextRequest, NextResponse } from "next/server";
import axios, { AxiosError } from "axios";

const NEYNAR_API_BASE_URL = "https://api.neynar.com";
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

if (!NEYNAR_API_KEY) {
  console.error("NEYNAR_API_KEY environment variable is not set");
}

const neynarClient = axios.create({
  baseURL: NEYNAR_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    ...(NEYNAR_API_KEY && { api_key: NEYNAR_API_KEY }),
  },
});

// Add response interceptor for better error handling
neynarClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      console.error(
        "Neynar Authentication failed. Please check your NEYNAR_API_KEY"
      );
    }
    return Promise.reject(error);
  }
);

// Helper function to add CORS headers
function getCorsHeaders(origin: string | null) {
  const allowedOrigins = [
    "https://swiss-knife.xyz",
    "https://usdc-pay.swiss-knife.xyz",
    "http://localhost:3000",
  ];

  const corsOrigin =
    origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

// Handle OPTIONS preflight request
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: getCorsHeaders(request.headers.get("origin")),
    }
  );
}

export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request.headers.get("origin"));
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const limit = parseInt(searchParams.get("limit") || "5");

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Remove @ from the beginning if present, as Neynar API doesn't work with @
    const cleanQuery = query.startsWith("@") ? query.slice(1) : query;

    const response = await neynarClient.get(
      `/v2/farcaster/user/search?q=${encodeURIComponent(
        cleanQuery
      )}&limit=${limit}`
    );

    return NextResponse.json(response.data.result.users, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Neynar search API error:", error);

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        return NextResponse.json(
          { error: "Authentication failed. Please check API configuration." },
          { status: 401, headers: corsHeaders }
        );
      }
      if (error.response?.status) {
        return NextResponse.json(
          {
            error: `API Error ${error.response.status}: ${error.response.statusText}`,
          },
          { status: error.response.status, headers: corsHeaders }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to search users" },
      { status: 500, headers: corsHeaders }
    );
  }
}
