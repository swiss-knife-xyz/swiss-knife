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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");

    if (!username) {
      return NextResponse.json(
        { error: "Username parameter is required" },
        { status: 400 }
      );
    }

    // Remove @ if present
    const cleanUsername = username.startsWith("@")
      ? username.slice(1)
      : username;

    const response = await neynarClient.get(
      `/v2/farcaster/user/bulk?usernames=${encodeURIComponent(cleanUsername)}`
    );

    const user = response.data.users?.[0] || null;
    return NextResponse.json(user);
  } catch (error) {
    console.error("Neynar user API error:", error);

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        return NextResponse.json(
          { error: "Authentication failed. Please check API configuration." },
          { status: 401 }
        );
      }
      if (error.response?.status) {
        return NextResponse.json(
          {
            error: `API Error ${error.response.status}: ${error.response.statusText}`,
          },
          { status: error.response.status }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to fetch user data" },
      { status: 500 }
    );
  }
}
