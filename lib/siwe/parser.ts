// SIWE message parser based on EIP-4361 ABNF grammar

import type {
  ParsedSiweMessage,
  SiweMessageFields,
  ValidationError,
} from "./types";

export class SiweMessageParser {
  private static readonly REQUIRED_FIELDS = [
    "domain",
    "address",
    "uri",
    "version",
    "chainId",
    "nonce",
    "issuedAt",
  ];

  private static readonly FIELD_PATTERNS = {
    // Domain pattern now allows optional port (e.g., example.com:3000)
    domain:
      /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(:[0-9]+)?$/,
    address: /^0x[a-fA-F0-9]{40}$/,
    uri: /^[a-zA-Z][a-zA-Z0-9+.-]*:/,
    version: /^1$/,
    chainId: /^[1-9]\d*$/,
    nonce: /^[a-zA-Z0-9]{8,}$/,
    datetime:
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?([+-]\d{2}:\d{2})?$/,
  };

  public static parse(message: string): ParsedSiweMessage {
    const lines = message.split("\n");
    const fields: SiweMessageFields = {};
    const parseErrors: ValidationError[] = [];
    let lineIndex = 0;

    try {
      // Parse header line: [scheme "://"] domain + " wants you to sign in with your Ethereum account:"
      // According to EIP-4361, the scheme is optional
      if (lineIndex < lines.length) {
        // Match with optional scheme (e.g., "https://example.com" or just "example.com")
        const headerMatch = lines[lineIndex].match(
          /^(?:([a-zA-Z][a-zA-Z0-9+.-]*):(?:\/\/))?(.+) wants you to sign in with your Ethereum account:$/
        );
        if (headerMatch) {
          // headerMatch[1] is the optional scheme, headerMatch[2] is the domain (with optional port)
          const scheme = headerMatch[1];
          const domainWithPort = headerMatch[2];

          // Store the domain (including port if present)
          fields.domain = domainWithPort;

          // Store the scheme separately if present (for validation or reconstruction)
          if (scheme) {
            fields.scheme = scheme;
          }
        } else {
          parseErrors.push(
            this.createParseError(
              "format",
              "header",
              lineIndex + 1,
              1,
              'Invalid header format. Expected: "[scheme://]domain wants you to sign in with your Ethereum account:"',
              "INVALID_HEADER"
            )
          );
        }
        lineIndex++;
      }

      // Parse address line
      if (lineIndex < lines.length && lines[lineIndex].trim()) {
        fields.address = lines[lineIndex].trim();
        lineIndex++;
      } else {
        parseErrors.push(
          this.createParseError(
            "format",
            "address",
            lineIndex + 1,
            1,
            "Missing Ethereum address",
            "MISSING_ADDRESS"
          )
        );
      }

      // Skip empty line after address
      if (lineIndex < lines.length && lines[lineIndex] === "") {
        lineIndex++;
      }

      // Parse optional statement (non-empty line that doesn't start with URI:)
      if (
        lineIndex < lines.length &&
        lines[lineIndex] &&
        !lines[lineIndex].startsWith("URI:")
      ) {
        fields.statement = lines[lineIndex];
        lineIndex++;
      }

      // Skip empty line(s) before required fields
      // Per EIP-4361: 1 empty line after statement, or 2 empty lines total when no statement
      while (lineIndex < lines.length && lines[lineIndex] === "") {
        lineIndex++;
      }

      // Parse required fields
      const fieldParsers = [
        { prefix: "URI: ", field: "uri" },
        { prefix: "Version: ", field: "version" },
        { prefix: "Chain ID: ", field: "chainId" },
        { prefix: "Nonce: ", field: "nonce" },
        { prefix: "Issued At: ", field: "issuedAt" },
      ];

      for (const { prefix, field } of fieldParsers) {
        if (lineIndex < lines.length && lines[lineIndex].startsWith(prefix)) {
          (fields as Record<string, string>)[field] =
            lines[lineIndex].substring(prefix.length);
          lineIndex++;
        } else {
          parseErrors.push(
            this.createParseError(
              "format",
              field,
              lineIndex + 1,
              1,
              `Missing required field: ${field}`,
              `MISSING_${field.toUpperCase()}`
            )
          );
        }
      }

      // Parse optional fields
      const optionalFields = [
        { prefix: "Expiration Time: ", field: "expirationTime" },
        { prefix: "Not Before: ", field: "notBefore" },
        { prefix: "Request ID: ", field: "requestId" },
      ];

      for (const { prefix, field } of optionalFields) {
        if (lineIndex < lines.length && lines[lineIndex].startsWith(prefix)) {
          (fields as Record<string, string>)[field] =
            lines[lineIndex].substring(prefix.length);
          lineIndex++;
        }
      }

      // Parse resources
      if (lineIndex < lines.length && lines[lineIndex] === "Resources:") {
        lineIndex++;
        const resources: string[] = [];
        while (lineIndex < lines.length && lines[lineIndex].startsWith("- ")) {
          resources.push(lines[lineIndex].substring(2));
          lineIndex++;
        }
        if (resources.length > 0) {
          fields.resources = resources;
        }
      }
    } catch (error) {
      parseErrors.push(
        this.createParseError(
          "format",
          "unknown",
          lineIndex + 1,
          1,
          `Parse error: ${error instanceof Error ? error.message : "Unknown error"}`,
          "PARSE_ERROR"
        )
      );
    }

    return {
      fields,
      lines,
      rawMessage: message,
      isValid: parseErrors.length === 0 && this.hasRequiredFields(fields),
      parseErrors,
    };
  }

  private static hasRequiredFields(fields: SiweMessageFields): boolean {
    return this.REQUIRED_FIELDS.every(
      (field) =>
        fields[field as keyof SiweMessageFields] !== undefined &&
        fields[field as keyof SiweMessageFields] !== ""
    );
  }

  private static createParseError(
    type: "format" | "security" | "compliance",
    field: string,
    line: number,
    column: number,
    message: string,
    code: string
  ): ValidationError {
    return {
      type,
      field,
      line,
      column,
      message,
      severity: "error",
      fixable: false,
      code,
    };
  }

  public static generateMessage(fields: SiweMessageFields): string {
    const lines: string[] = [];

    // Header (with optional scheme)
    if (fields.domain) {
      const prefix = fields.scheme ? `${fields.scheme}://` : "";
      lines.push(
        `${prefix}${fields.domain} wants you to sign in with your Ethereum account:`
      );
    }

    // Address
    if (fields.address) {
      lines.push(fields.address);
    }

    // Per EIP-4361: 1 empty line + statement + 1 empty line, or 2 empty lines if no statement
    if (fields.statement) {
      lines.push("");
      lines.push(fields.statement);
      lines.push("");
    } else {
      lines.push("");
      lines.push("");
    }

    // Required fields
    if (fields.uri) lines.push(`URI: ${fields.uri}`);
    if (fields.version) lines.push(`Version: ${fields.version}`);
    if (fields.chainId) lines.push(`Chain ID: ${fields.chainId}`);
    if (fields.nonce) lines.push(`Nonce: ${fields.nonce}`);
    if (fields.issuedAt) lines.push(`Issued At: ${fields.issuedAt}`);

    // Optional fields
    if (fields.expirationTime)
      lines.push(`Expiration Time: ${fields.expirationTime}`);
    if (fields.notBefore) lines.push(`Not Before: ${fields.notBefore}`);
    if (fields.requestId) lines.push(`Request ID: ${fields.requestId}`);

    // Resources
    if (fields.resources && fields.resources.length > 0) {
      lines.push("Resources:");
      fields.resources.forEach((resource) => {
        lines.push(`- ${resource}`);
      });
    }

    return lines.join("\n");
  }

  public static getFieldLine(message: string, fieldName: string): number {
    const lines = message.split("\n");

    // Special handling for domain (header line)
    if (fieldName === "domain") {
      return 1;
    }

    // Special handling for address (second line)
    if (fieldName === "address") {
      return 2;
    }

    // Special handling for statement
    if (fieldName === "statement") {
      let lineIndex = 0;
      // Skip header and address
      if (lines[0] && lines[0].includes("wants you to sign in")) lineIndex++;
      if (lines[lineIndex] && lines[lineIndex].trim()) lineIndex++;
      if (lines[lineIndex] === "") lineIndex++;

      if (lines[lineIndex] && !lines[lineIndex].startsWith("URI:")) {
        return lineIndex + 1;
      }
      return -1; // Statement not found
    }

    // For other fields, search for the prefix
    const prefixes: { [key: string]: string } = {
      uri: "URI: ",
      version: "Version: ",
      chainId: "Chain ID: ",
      nonce: "Nonce: ",
      issuedAt: "Issued At: ",
      expirationTime: "Expiration Time: ",
      notBefore: "Not Before: ",
      requestId: "Request ID: ",
    };

    const prefix = prefixes[fieldName];
    if (!prefix) return -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith(prefix)) {
        return i + 1;
      }
    }

    return -1; // Field not found
  }
}

