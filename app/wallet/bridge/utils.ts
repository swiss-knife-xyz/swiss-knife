import { hexToString, isHex } from "viem";

// Helper function to decode personal_sign and eth_sign messages
export const decodeSignMessage = (hexMessage: string) => {
  try {
    // Try to decode as UTF-8 string
    if (isHex(hexMessage)) {
      // First try to decode as UTF-8
      try {
        // viem doesn't have hexToUtf8, but hexToString should work for UTF-8
        return {
          decoded: hexToString(hexMessage),
          type: "utf8",
        };
      } catch (e) {
        // If that fails, return the original hex
        return {
          decoded: hexMessage,
          type: "hex",
        };
      }
    }

    // If it's not hex, it might already be a string
    return {
      decoded: hexMessage,
      type: "string",
    };
  } catch (error) {
    console.error("Error decoding message:", error);
    return {
      decoded: hexMessage,
      type: "unknown",
    };
  }
};

// Helper function to format EIP-712 typed data in a human-readable way
export const formatTypedData = (typedData: any) => {
  if (!typedData) return null;

  try {
    // If typedData is a string, try to parse it
    const data =
      typeof typedData === "string" ? JSON.parse(typedData) : typedData;

    // Infer primaryType if not provided (some dApps don't include it)
    let primaryType = data.primaryType;
    if (!primaryType && data.types) {
      const typeNames = Object.keys(data.types).filter(
        (t) => t !== "EIP712Domain"
      );
      if (typeNames.length === 1) {
        primaryType = typeNames[0];
      } else if (typeNames.length > 1 && data.message) {
        // Try to find the type that matches the message structure
        primaryType =
          typeNames.find((typeName) => {
            const typeFields = data.types[typeName];
            return typeFields?.every(
              (field: { name: string }) => field.name in data.message
            );
          }) || typeNames[0];
      }
    }

    return {
      domain: data.domain,
      primaryType: primaryType,
      types: data.types,
      message: data.message,
    };
  } catch (error) {
    console.error("Error formatting typed data:", error);
    return null;
  }
};

// If the wagmi wallet is connected via wallet connect, then we need to filter it out from the dapp sessions
export const filterActiveSessions = (sessions: any[]) => {
  // loop through sessions
  // check if session.controller matches session.self.publicKey for dapp sessions
  return sessions.filter((session) => {
    return session.controller === session.self.publicKey;
  });
};

// Helper function to validate URLs
export const isValidUrl = (urlString: string): boolean => {
  try {
    const url = new URL(urlString);
    // Check if protocol is http or https
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (e) {
    return false;
  }
};
