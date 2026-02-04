// Field-level validation rules for SIWE messages

import type {
  ValidationError,
  ParsedSiweMessage,
  AddressValidation,
  TimeValidation,
  UriValidation,
  NonceValidation,
  DomainValidation,
} from "./types";
import { SiweMessageParser } from "./parser";

export class FieldValidators {
  // Domain validation
  static validateDomain(message: ParsedSiweMessage): ValidationError[] {
    const errors: ValidationError[] = [];
    const domain = message.fields.domain;
    const line = SiweMessageParser.getFieldLine(message.rawMessage, "domain");

    if (!domain) {
      errors.push({
        type: "format",
        field: "domain",
        line,
        column: 1,
        message: "Domain is required",
        severity: "error",
        fixable: false,
        code: "DOMAIN_REQUIRED",
      });
      return errors;
    }

    const validation = this.validateDomainFormat(domain);

    if (!validation.isValid) {
      errors.push({
        type: "format",
        field: "domain",
        line,
        column: 1,
        message: "Invalid domain format. Must be a valid RFC 3986 authority",
        severity: "error",
        fixable: false,
        suggestion: "Use format: example.com or subdomain.example.com",
        code: "DOMAIN_INVALID_FORMAT",
      });
    }

    if (validation.securityRisk !== "none") {
      errors.push({
        type: "security",
        field: "domain",
        line,
        column: 1,
        message: `Domain has ${validation.securityRisk} security risk`,
        severity: validation.securityRisk === "high" ? "error" : "warning",
        fixable: false,
        code: "DOMAIN_SECURITY_RISK",
      });
    }

    return errors;
  }

  // Ethereum address validation
  static validateAddress(message: ParsedSiweMessage): ValidationError[] {
    const errors: ValidationError[] = [];
    const address = message.fields.address;
    const line = SiweMessageParser.getFieldLine(message.rawMessage, "address");

    if (!address) {
      errors.push({
        type: "format",
        field: "address",
        line,
        column: 1,
        message: "Ethereum address is required",
        severity: "error",
        fixable: false,
        code: "ADDRESS_REQUIRED",
      });
      return errors;
    }

    const validation = this.validateAddressFormat(address);

    if (!validation.isValid) {
      errors.push({
        type: "format",
        field: "address",
        line,
        column: 1,
        message:
          "Invalid Ethereum address format. Must be 40-character hex with 0x prefix",
        severity: "error",
        fixable: true,
        suggestion:
          "Ensure address starts with 0x followed by 40 hexadecimal characters",
        code: "ADDRESS_INVALID_FORMAT",
      });
    } else if (!validation.isChecksum) {
      errors.push({
        type: "format",
        field: "address",
        line,
        column: 1,
        message:
          "Address should use EIP-55 checksum format for better security",
        severity: "warning",
        fixable: true,
        suggestion:
          "Convert to checksum format: mix of uppercase and lowercase letters",
        code: "ADDRESS_NOT_CHECKSUM",
      });
    }

    return errors;
  }

  // URI validation
  static validateUri(message: ParsedSiweMessage): ValidationError[] {
    const errors: ValidationError[] = [];
    const uri = message.fields.uri;
    const line = SiweMessageParser.getFieldLine(message.rawMessage, "uri");

    if (!uri) {
      errors.push({
        type: "format",
        field: "uri",
        line,
        column: 1,
        message: "URI is required",
        severity: "error",
        fixable: false,
        code: "URI_REQUIRED",
      });
      return errors;
    }

    const validation = this.validateUriFormat(uri);

    if (!validation.isValid) {
      errors.push({
        type: "format",
        field: "uri",
        line,
        column: 1,
        message: "Invalid URI format. Must be a valid RFC 3986 URI",
        severity: "error",
        fixable: false,
        suggestion: "Use format: https://example.com/path",
        code: "URI_INVALID_FORMAT",
      });
    }

    if (validation.scheme && !["https", "http"].includes(validation.scheme)) {
      errors.push({
        type: "security",
        field: "uri",
        line,
        column: 1,
        message: "Consider using HTTPS for better security",
        severity: "warning",
        fixable: true,
        suggestion: "Replace http:// with https://",
        code: "URI_INSECURE_SCHEME",
      });
    }

    return errors;
  }

  // Version validation
  static validateVersion(message: ParsedSiweMessage): ValidationError[] {
    const errors: ValidationError[] = [];
    const version = message.fields.version;
    const line = SiweMessageParser.getFieldLine(message.rawMessage, "version");

    if (!version) {
      errors.push({
        type: "format",
        field: "version",
        line,
        column: 1,
        message: "Version is required",
        severity: "error",
        fixable: true,
        suggestion: 'Add "Version: 1"',
        code: "VERSION_REQUIRED",
      });
      return errors;
    }

    if (version !== "1") {
      errors.push({
        type: "compliance",
        field: "version",
        line,
        column: 1,
        message: 'Version must be "1" for EIP-4361 compliance',
        severity: "error",
        fixable: true,
        suggestion: 'Set version to "1"',
        code: "VERSION_INVALID",
      });
    }

    return errors;
  }

  // Chain ID validation
  static validateChainId(message: ParsedSiweMessage): ValidationError[] {
    const errors: ValidationError[] = [];
    const chainId = message.fields.chainId;
    const line = SiweMessageParser.getFieldLine(message.rawMessage, "chainId");

    if (!chainId) {
      errors.push({
        type: "format",
        field: "chainId",
        line,
        column: 1,
        message: "Chain ID is required",
        severity: "error",
        fixable: false,
        code: "CHAIN_ID_REQUIRED",
      });
      return errors;
    }

    if (!/^[1-9]\d*$/.test(chainId)) {
      errors.push({
        type: "format",
        field: "chainId",
        line,
        column: 1,
        message: "Chain ID must be a positive integer (EIP-155)",
        severity: "error",
        fixable: false,
        suggestion:
          "Use valid chain ID: 1 (Ethereum), 5 (Goerli), 137 (Polygon), etc.",
        code: "CHAIN_ID_INVALID_FORMAT",
      });
    } else {
      const chainIdNum = parseInt(chainId, 10);
      if (chainIdNum === 0) {
        errors.push({
          type: "format",
          field: "chainId",
          line,
          column: 1,
          message: "Chain ID cannot be 0",
          severity: "error",
          fixable: false,
          code: "CHAIN_ID_ZERO",
        });
      }
    }

    return errors;
  }

  // Nonce validation
  static validateNonce(message: ParsedSiweMessage): ValidationError[] {
    const errors: ValidationError[] = [];
    const nonce = message.fields.nonce;
    const line = SiweMessageParser.getFieldLine(message.rawMessage, "nonce");

    if (!nonce) {
      errors.push({
        type: "format",
        field: "nonce",
        line,
        column: 1,
        message: "Nonce is required",
        severity: "error",
        fixable: true,
        suggestion: "Generate a cryptographically secure random nonce",
        code: "NONCE_REQUIRED",
      });
      return errors;
    }

    const validation = this.validateNonceFormat(nonce);

    if (!validation.isValid) {
      errors.push({
        type: "format",
        field: "nonce",
        line,
        column: 1,
        message: "Nonce must be at least 8 alphanumeric characters",
        severity: "error",
        fixable: true,
        suggestion: "Use a longer random string with letters and numbers",
        code: "NONCE_TOO_SHORT",
      });
    }

    if (validation.pattern === "weak") {
      errors.push({
        type: "security",
        field: "nonce",
        line,
        column: 1,
        message: "Nonce appears to have low entropy (security risk)",
        severity: "warning",
        fixable: true,
        suggestion: "Use a cryptographically secure random nonce generator",
        code: "NONCE_WEAK_ENTROPY",
      });
    }

    if (validation.pattern === "sequential") {
      errors.push({
        type: "security",
        field: "nonce",
        line,
        column: 1,
        message: "Nonce appears to be sequential (replay attack risk)",
        severity: "error",
        fixable: true,
        suggestion: "Use random nonce generation instead of sequential values",
        code: "NONCE_SEQUENTIAL",
      });
    }

    return errors;
  }

  // Timestamp validation (issuedAt)
  static validateIssuedAt(message: ParsedSiweMessage): ValidationError[] {
    const errors: ValidationError[] = [];
    const issuedAt = message.fields.issuedAt;
    const line = SiweMessageParser.getFieldLine(message.rawMessage, "issuedAt");

    if (!issuedAt) {
      errors.push({
        type: "format",
        field: "issuedAt",
        line,
        column: 1,
        message: "Issued At timestamp is required",
        severity: "error",
        fixable: true,
        suggestion: "Add current timestamp in RFC 3339 format",
        code: "ISSUED_AT_REQUIRED",
      });
      return errors;
    }

    const validation = this.validateTimestamp(issuedAt);

    if (!validation.isValid) {
      errors.push({
        type: "format",
        field: "issuedAt",
        line,
        column: 1,
        message: "Invalid timestamp format. Must be RFC 3339 (ISO 8601)",
        severity: "error",
        fixable: true,
        suggestion:
          "Use format: 2023-10-31T16:30:00Z or 2023-10-31T16:30:00+00:00",
        code: "ISSUED_AT_INVALID_FORMAT",
      });
    } else if (validation.timestamp) {
      const now = new Date();
      const timeDiff = Math.abs(now.getTime() - validation.timestamp.getTime());
      const oneHour = 60 * 60 * 1000;

      if (timeDiff > oneHour) {
        errors.push({
          type: "security",
          field: "issuedAt",
          line,
          column: 1,
          message:
            "Issued At timestamp is more than 1 hour from current time",
          severity: "warning",
          fixable: false,
          suggestion: "Ensure timestamp reflects actual message creation time",
          code: "ISSUED_AT_TIME_DRIFT",
        });
      }
    }

    return errors;
  }

  // Expiration time validation
  static validateExpirationTime(message: ParsedSiweMessage): ValidationError[] {
    const errors: ValidationError[] = [];
    const expirationTime = message.fields.expirationTime;

    if (!expirationTime) {
      return errors; // Optional field
    }

    const line = SiweMessageParser.getFieldLine(
      message.rawMessage,
      "expirationTime"
    );
    const validation = this.validateTimestamp(expirationTime);

    if (!validation.isValid) {
      errors.push({
        type: "format",
        field: "expirationTime",
        line,
        column: 1,
        message:
          "Invalid expiration timestamp format. Must be RFC 3339 (ISO 8601)",
        severity: "error",
        fixable: true,
        suggestion: "Use format: 2023-10-31T16:30:00Z",
        code: "EXPIRATION_TIME_INVALID_FORMAT",
      });
      return errors;
    }

    if (validation.timestamp) {
      const now = new Date();
      const issuedAt = message.fields.issuedAt;

      // Check if already expired
      if (validation.timestamp < now) {
        errors.push({
          type: "security",
          field: "expirationTime",
          line,
          column: 1,
          message: "Message has already expired",
          severity: "error",
          fixable: false,
          code: "MESSAGE_EXPIRED",
        });
      }

      // Check expiration window
      const timeDiff = validation.timestamp.getTime() - now.getTime();
      const oneDay = 24 * 60 * 60 * 1000;
      const fiveMinutes = 5 * 60 * 1000;

      if (timeDiff > oneDay) {
        errors.push({
          type: "security",
          field: "expirationTime",
          line,
          column: 1,
          message:
            "Expiration time is more than 24 hours in the future (security risk)",
          severity: "warning",
          fixable: false,
          suggestion: "Consider shorter expiration windows (5-15 minutes)",
          code: "EXPIRATION_TOO_LONG",
        });
      } else if (timeDiff < fiveMinutes) {
        errors.push({
          type: "security",
          field: "expirationTime",
          line,
          column: 1,
          message: "Expiration time is very short (less than 5 minutes)",
          severity: "warning",
          fixable: false,
          suggestion: "Allow sufficient time for user to sign the message",
          code: "EXPIRATION_TOO_SHORT",
        });
      }

      // Compare with issuedAt
      if (issuedAt) {
        const issuedAtValidation = this.validateTimestamp(issuedAt);
        if (
          issuedAtValidation.timestamp &&
          validation.timestamp <= issuedAtValidation.timestamp
        ) {
          errors.push({
            type: "format",
            field: "expirationTime",
            line,
            column: 1,
            message: "Expiration time must be after issued at time",
            severity: "error",
            fixable: false,
            code: "EXPIRATION_BEFORE_ISSUED",
          });
        }
      }
    }

    return errors;
  }

  // Statement validation
  static validateStatement(message: ParsedSiweMessage): ValidationError[] {
    const errors: ValidationError[] = [];
    const statement = message.fields.statement;

    if (!statement) {
      return errors; // Optional field
    }

    const line = SiweMessageParser.getFieldLine(
      message.rawMessage,
      "statement"
    );

    // Check for line breaks
    if (statement.includes("\n") || statement.includes("\r")) {
      errors.push({
        type: "format",
        field: "statement",
        line,
        column: 1,
        message: "Statement cannot contain line breaks",
        severity: "error",
        fixable: true,
        suggestion: "Remove line breaks from statement",
        code: "STATEMENT_LINE_BREAKS",
      });
    }

    // Check length
    if (statement.length > 200) {
      errors.push({
        type: "format",
        field: "statement",
        line,
        column: 1,
        message: "Statement is very long (may cause display issues)",
        severity: "warning",
        fixable: false,
        suggestion: "Consider shortening statement for better user experience",
        code: "STATEMENT_TOO_LONG",
      });
    }

    return errors;
  }

  // Helper methods for specific validations

  private static validateDomainFormat(domain: string): DomainValidation {
    // Extract domain and port if present (e.g., "example.com:3000")
    let domainPart = domain;
    let port: string | null = null;

    const portMatch = domain.match(/^(.+):(\d+)$/);
    if (portMatch) {
      domainPart = portMatch[1];
      port = portMatch[2];

      // Validate port range (1-65535)
      const portNum = parseInt(port, 10);
      if (portNum < 1 || portNum > 65535) {
        return {
          isValid: false,
          isSubdomain: false,
          tld: null,
          securityRisk: "none",
        };
      }
    }

    // Basic domain format validation (now without port)
    const domainRegex =
      /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

    // Also allow IP addresses (IPv4 for now)
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const isIPv4 = ipv4Regex.test(domainPart);

    // Check if it's localhost
    const isLocalhost = domainPart === "localhost";

    const isValid =
      (domainRegex.test(domainPart) || isIPv4 || isLocalhost) &&
      domainPart.length <= 253;

    const parts = domainPart.split(".");
    const tld =
      !isIPv4 && !isLocalhost && parts.length > 1
        ? parts[parts.length - 1]
        : null;
    const isSubdomain = !isIPv4 && !isLocalhost && parts.length > 2;

    // Basic security risk assessment
    let securityRisk: "none" | "low" | "medium" | "high" = "none";
    if (
      isLocalhost ||
      domainPart.includes("127.0.0.1") ||
      domainPart === "0.0.0.0"
    ) {
      securityRisk = "low";
    }

    return {
      isValid,
      isSubdomain,
      tld,
      securityRisk,
    };
  }

  private static validateAddressFormat(address: string): AddressValidation {
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    const isValid = addressRegex.test(address);

    if (!isValid) {
      return { isValid: false, isChecksum: false, format: "lowercase" };
    }

    const hex = address.slice(2);
    const hasUppercase = /[A-F]/.test(hex);
    const hasLowercase = /[a-f]/.test(hex);

    let format: "lowercase" | "uppercase" | "mixed" | "checksum";

    if (hasUppercase && hasLowercase) {
      format = "mixed";
    } else if (hasUppercase) {
      format = "uppercase";
    } else {
      format = "lowercase";
    }

    // Simple checksum validation (would need full implementation for production)
    const isChecksum = format === "mixed";

    return {
      isValid,
      isChecksum,
      format,
    };
  }

  private static validateUriFormat(uri: string): UriValidation {
    try {
      const url = new URL(uri);
      return {
        isValid: true,
        scheme: url.protocol.slice(0, -1),
        authority: url.host,
        path: url.pathname,
        query: url.search.slice(1) || null,
        fragment: url.hash.slice(1) || null,
      };
    } catch {
      return {
        isValid: false,
        scheme: null,
        authority: null,
        path: null,
        query: null,
        fragment: null,
      };
    }
  }

  private static validateNonceFormat(nonce: string): NonceValidation {
    const alphanumericRegex = /^[a-zA-Z0-9]+$/;
    const isValid = alphanumericRegex.test(nonce) && nonce.length >= 8;

    // Simple entropy calculation
    const uniqueChars = new Set(nonce).size;
    const entropy = uniqueChars / nonce.length;

    // Pattern detection
    let pattern: "random" | "sequential" | "predictable" | "weak";

    if (entropy < 0.3) {
      pattern = "weak";
    } else if (/^(0123456789|abcdefgh|12345678)/.test(nonce)) {
      pattern = "sequential";
    } else if (entropy < 0.5) {
      pattern = "predictable";
    } else {
      pattern = "random";
    }

    return {
      isValid,
      length: nonce.length,
      entropy,
      pattern,
    };
  }

  private static validateTimestamp(timestamp: string): TimeValidation {
    const iso8601Regex =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?([+-]\d{2}:\d{2})?$/;
    const isValid = iso8601Regex.test(timestamp);

    if (!isValid) {
      return {
        isValid: false,
        format: timestamp,
        timestamp: null,
        timezone: null,
      };
    }

    try {
      const date = new Date(timestamp);
      const timezone = timestamp.includes("Z")
        ? "UTC"
        : timestamp.includes("+") || timestamp.includes("-")
          ? "offset"
          : "local";

      return {
        isValid: !isNaN(date.getTime()),
        format: timestamp,
        timestamp: date,
        timezone,
      };
    } catch {
      return {
        isValid: false,
        format: timestamp,
        timestamp: null,
        timezone: null,
      };
    }
  }
}

