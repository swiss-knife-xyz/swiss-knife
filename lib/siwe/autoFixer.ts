// Auto-fix functionality for SIWE message validation

import type {
  AutoFixResult,
  ParsedSiweMessage,
  SiweMessageFields,
  ValidationError,
} from "./types";
import { SiweMessageParser } from "./parser";
import { getAddress } from "viem";

export class AutoFixer {
  public static fixMessage(
    message: ParsedSiweMessage,
    errors: ValidationError[]
  ): AutoFixResult {
    const fixableErrors = errors.filter((error) => error.fixable);

    if (fixableErrors.length === 0) {
      return {
        fixed: false,
        message: message.rawMessage,
        appliedFixes: [],
        remainingIssues: errors,
      };
    }

    let fixedFields = { ...message.fields };
    const appliedFixes: string[] = [];
    const remainingIssues: ValidationError[] = [];

    // Process each fixable error
    for (const error of errors) {
      if (error.fixable) {
        const fixResult = this.applyFix(fixedFields, error);
        if (fixResult.applied) {
          fixedFields = fixResult.fields;
          appliedFixes.push(fixResult.description);
        } else {
          remainingIssues.push(error);
        }
      } else {
        remainingIssues.push(error);
      }
    }

    // Generate the fixed message
    const fixedMessage = SiweMessageParser.generateMessage(fixedFields);

    return {
      fixed: appliedFixes.length > 0,
      message: fixedMessage,
      appliedFixes,
      remainingIssues,
    };
  }

  private static applyFix(
    fields: SiweMessageFields,
    error: ValidationError
  ): {
    applied: boolean;
    fields: SiweMessageFields;
    description: string;
  } {
    const newFields = { ...fields };

    switch (error.code) {
      // Address fixes
      case "ADDRESS_NOT_CHECKSUM":
        if (newFields.address) {
          newFields.address = this.toChecksumAddress(newFields.address);
          return {
            applied: true,
            fields: newFields,
            description: "Converted address to EIP-55 checksum format",
          };
        }
        break;

      case "ADDRESS_INVALID_FORMAT":
        if (newFields.address) {
          const fixed = this.fixAddressFormat(newFields.address);
          if (fixed) {
            newFields.address = fixed;
            return {
              applied: true,
              fields: newFields,
              description:
                "Fixed address format (added 0x prefix or corrected length)",
            };
          }
        }
        break;

      // Version fixes
      case "VERSION_REQUIRED":
        newFields.version = "1";
        return {
          applied: true,
          fields: newFields,
          description: "Added required version field",
        };

      case "VERSION_INVALID":
        newFields.version = "1";
        return {
          applied: true,
          fields: newFields,
          description: 'Corrected version to "1" for EIP-4361 compliance',
        };

      // Timestamp fixes
      case "ISSUED_AT_REQUIRED":
        newFields.issuedAt = new Date().toISOString();
        return {
          applied: true,
          fields: newFields,
          description: "Added current timestamp for issuedAt",
        };

      case "ISSUED_AT_INVALID_FORMAT":
        if (newFields.issuedAt) {
          const fixed = this.fixTimestampFormat(newFields.issuedAt);
          if (fixed) {
            newFields.issuedAt = fixed;
            return {
              applied: true,
              fields: newFields,
              description: "Fixed issuedAt timestamp format to RFC 3339",
            };
          }
        }
        break;

      case "EXPIRATION_TIME_INVALID_FORMAT":
        if (newFields.expirationTime) {
          const fixed = this.fixTimestampFormat(newFields.expirationTime);
          if (fixed) {
            newFields.expirationTime = fixed;
            return {
              applied: true,
              fields: newFields,
              description: "Fixed expirationTime timestamp format to RFC 3339",
            };
          }
        }
        break;

      // Nonce fixes
      case "NONCE_REQUIRED":
        newFields.nonce = this.generateSecureNonce();
        return {
          applied: true,
          fields: newFields,
          description: "Generated cryptographically secure nonce",
        };

      case "NONCE_TOO_SHORT":
      case "SECURITY_SHORT_NONCE":
        if (newFields.nonce && newFields.nonce.length < 12) {
          newFields.nonce = this.extendNonce(newFields.nonce);
          return {
            applied: true,
            fields: newFields,
            description: "Extended nonce to meet minimum security length",
          };
        }
        break;

      case "NONCE_WEAK_ENTROPY":
      case "SECURITY_WEAK_NONCE_PATTERN":
      case "SECURITY_LOW_NONCE_COMPLEXITY":
        newFields.nonce = this.generateSecureNonce();
        return {
          applied: true,
          fields: newFields,
          description: "Replaced weak nonce with cryptographically secure one",
        };

      // URI fixes
      case "URI_INSECURE_SCHEME":
        if (newFields.uri && newFields.uri.startsWith("http://")) {
          newFields.uri = newFields.uri.replace("http://", "https://");
          return {
            applied: true,
            fields: newFields,
            description: "Changed URI scheme from HTTP to HTTPS",
          };
        }
        break;

      // Statement fixes
      case "STATEMENT_LINE_BREAKS":
        if (newFields.statement) {
          newFields.statement = newFields.statement
            .replace(/[\r\n]+/g, " ")
            .trim();
          return {
            applied: true,
            fields: newFields,
            description: "Removed line breaks from statement",
          };
        }
        break;

      // Expiration time fixes
      case "SECURITY_NO_EXPIRATION":
        if (!newFields.expirationTime && newFields.issuedAt) {
          const issuedDate = new Date(newFields.issuedAt);
          const expiration = new Date(
            issuedDate.getTime() + 10 * 60 * 1000
          ); // 10 minutes
          newFields.expirationTime = expiration.toISOString();
          return {
            applied: true,
            fields: newFields,
            description: "Added 10-minute expiration time for security",
          };
        } else if (!newFields.expirationTime) {
          const now = new Date();
          const expiration = new Date(
            now.getTime() + 10 * 60 * 1000
          ); // 10 minutes
          newFields.expirationTime = expiration.toISOString();
          return {
            applied: true,
            fields: newFields,
            description: "Added 10-minute expiration time for security",
          };
        }
        break;
    }

    return {
      applied: false,
      fields: newFields,
      description: "",
    };
  }

  // Helper methods for specific fixes

  // Uses viem's getAddress() for proper EIP-55 checksum encoding via keccak256.
  // The previous implementation used a naive `i % 2` heuristic which produced
  // incorrect checksums — EIP-55 requires hashing the lowercase hex address with
  // keccak256 and using each nibble of the hash to determine letter casing.
  private static toChecksumAddress(address: string): string {
    if (!address.startsWith("0x") || address.length !== 42) {
      return address; // Can't fix invalid addresses
    }

    try {
      return getAddress(address);
    } catch {
      return address;
    }
  }

  private static fixAddressFormat(address: string): string | null {
    // Remove any whitespace
    address = address.trim();

    // Add 0x prefix if missing
    if (!address.startsWith("0x") && /^[a-fA-F0-9]{40}$/.test(address)) {
      return "0x" + address;
    }

    // Check if it's a valid hex string with 0x prefix
    if (address.startsWith("0x") && /^0x[a-fA-F0-9]{40}$/.test(address)) {
      return address;
    }

    return null; // Can't fix this address
  }

  private static fixTimestampFormat(timestamp: string): string | null {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return null;
      }

      // Convert to RFC 3339 format
      return date.toISOString();
    } catch {
      return null;
    }
  }

  private static generateSecureNonce(): string {
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";

    // Generate 16-character nonce for good security
    for (let i = 0; i < 16; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }

    return result;
  }

  private static extendNonce(existingNonce: string): string {
    const targetLength = Math.max(12, existingNonce.length + 4);
    const additionalChars = targetLength - existingNonce.length;

    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let extension = "";

    for (let i = 0; i < additionalChars; i++) {
      extension += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }

    return existingNonce + extension;
  }

  // Generate a template message with secure defaults
  public static generateTemplate(
    options: Partial<SiweMessageFields> = {}
  ): string {
    const now = new Date();
    const expiration = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

    const template: SiweMessageFields = {
      domain: options.domain || "example.com",
      address:
        options.address || "0x742d35Cc6C4C1Ca5d428d9eE0e9B1E1234567890",
      statement: options.statement || "Sign in with Ethereum to authenticate.",
      uri: options.uri || "https://example.com",
      version: "1",
      chainId: options.chainId || "1",
      nonce: this.generateSecureNonce(),
      issuedAt: now.toISOString(),
      expirationTime: expiration.toISOString(),
      ...options,
    };

    return SiweMessageParser.generateMessage(template);
  }

  // Fix common formatting issues in the entire message
  public static fixCommonFormatting(message: string): string {
    let fixed = message;

    // Fix common line ending issues
    fixed = fixed.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    // Remove extra whitespace but preserve structure
    const lines = fixed.split("\n");
    const cleanedLines = lines.map((line) => line.trimEnd());

    // Ensure proper spacing around empty lines
    const result: string[] = [];
    for (let i = 0; i < cleanedLines.length; i++) {
      const line = cleanedLines[i];
      const nextLine = cleanedLines[i + 1];

      result.push(line);

      // Add proper spacing after address and statement
      if (i === 1 && line.trim() && nextLine && !nextLine.startsWith("URI:")) {
        // After address, before statement - need empty line
        if (nextLine !== "") {
          result.push("");
        }
      } else if (line.trim() && nextLine && nextLine.startsWith("URI:")) {
        // After statement, before URI - need empty line
        if (cleanedLines[i - 1] !== "") {
          result.push("");
        }
      }
    }

    return result.join("\n");
  }

  // Preview what fixes would be applied without actually applying them
  public static previewFixes(
    message: ParsedSiweMessage,
    errors: ValidationError[]
  ): {
    fixableCount: number;
    fixes: Array<{ error: ValidationError; description: string }>;
  } {
    const fixableErrors = errors.filter((error) => error.fixable);
    const fixes: Array<{ error: ValidationError; description: string }> = [];

    for (const error of fixableErrors) {
      const description = this.getFixDescription(error);
      if (description) {
        fixes.push({ error, description });
      }
    }

    return {
      fixableCount: fixes.length,
      fixes,
    };
  }

  private static getFixDescription(error: ValidationError): string | null {
    switch (error.code) {
      case "ADDRESS_NOT_CHECKSUM":
        return "Convert address to EIP-55 checksum format";
      case "ADDRESS_INVALID_FORMAT":
        return "Fix address format (add 0x prefix or correct length)";
      case "VERSION_REQUIRED":
        return "Add required version field";
      case "VERSION_INVALID":
        return 'Correct version to "1" for EIP-4361 compliance';
      case "ISSUED_AT_REQUIRED":
        return "Add current timestamp for issuedAt";
      case "ISSUED_AT_INVALID_FORMAT":
        return "Fix issuedAt timestamp format to RFC 3339";
      case "EXPIRATION_TIME_INVALID_FORMAT":
        return "Fix expirationTime timestamp format to RFC 3339";
      case "NONCE_REQUIRED":
        return "Generate cryptographically secure nonce";
      case "NONCE_TOO_SHORT":
      case "SECURITY_SHORT_NONCE":
        return "Extend nonce to meet minimum security length";
      case "NONCE_WEAK_ENTROPY":
      case "SECURITY_WEAK_NONCE_PATTERN":
      case "SECURITY_LOW_NONCE_COMPLEXITY":
        return "Replace weak nonce with cryptographically secure one";
      case "URI_INSECURE_SCHEME":
        return "Change URI scheme from HTTP to HTTPS";
      case "STATEMENT_LINE_BREAKS":
        return "Remove line breaks from statement";
      case "SECURITY_NO_EXPIRATION":
        return "Add 10-minute expiration time for security";
      default:
        return null;
    }
  }
}

