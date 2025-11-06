import axios from "axios";
import { NeynarUser } from "@/types/neynar";

const internalClient = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Helper function to handle API errors
const handleApiError = (error: unknown, defaultMessage: string): Error => {
  console.error("Farcaster API Error:", error);

  if (axios.isAxiosError(error)) {
    if (error.response?.data?.error) {
      return new Error(error.response.data.error);
    }
    if (error.response?.status) {
      return new Error(
        `API Error ${error.response.status}: ${error.response.statusText}`
      );
    }
  }

  return new Error(defaultMessage);
};

export const isFarcasterUsername = (input: string): boolean => {
  // Check if it looks like a Farcaster username (alphanumeric, may start with @, no 0x prefix)
  const cleanInput = input.startsWith("@") ? input.slice(1) : input;
  return /^[a-zA-Z0-9._-]+$/.test(cleanInput) && !input.startsWith("0x");
};

export const farcasterApi = {
  // Search for users by username/display name
  async searchUsers(query: string, limit: number = 5): Promise<NeynarUser[]> {
    try {
      const params = new URLSearchParams({
        q: query,
        limit: limit.toString(),
      });

      const response = await internalClient.get(
        `/neynar/search?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error, "Failed to search users");
    }
  },

  // Get user by username
  async getUserByUsername(username: string): Promise<NeynarUser | null> {
    try {
      const params = new URLSearchParams({
        username,
      });

      const response = await internalClient.get(
        `/neynar/user?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error, "Failed to fetch user by username");
    }
  },

  // Get primary ETH address from a Farcaster user
  async getPrimaryAddress(username: string): Promise<string | null> {
    try {
      const user = await this.getUserByUsername(username);
      if (!user) return null;

      // Return the first verified ETH address, or custody address as fallback
      return (
        user.verified_addresses.eth_addresses[0] || user.custody_address || null
      );
    } catch (error) {
      throw handleApiError(error, "Failed to get primary address");
    }
  },
};
