// Targeted field replacement for SIWE messages

import type { ValidationError, SiweMessageFields } from "./types";
import { SiweMessageParser } from "./parser";

export class FieldReplacer {
  /**
   * Replace a specific field value in the raw message string
   * Unlike AutoFixer which regenerates the whole message,
   * this preserves the original formatting as much as possible
   */
  public static replaceField(
    message: string,
    fieldName: keyof SiweMessageFields,
    newValue: string
  ): string {
    const lines = message.split("\n");

    switch (fieldName) {
      case "domain":
        return this.replaceDomainField(lines, newValue);
      case "address":
        return this.replaceAddressField(lines, newValue);
      case "statement":
        return this.replaceStatementField(lines, newValue);
      case "uri":
        return this.replaceSimpleField(lines, "URI: ", newValue);
      case "version":
        return this.replaceSimpleField(lines, "Version: ", newValue);
      case "chainId":
        return this.replaceSimpleField(lines, "Chain ID: ", newValue);
      case "nonce":
        return this.replaceSimpleField(lines, "Nonce: ", newValue);
      case "issuedAt":
        return this.replaceSimpleField(lines, "Issued At: ", newValue);
      case "expirationTime":
        return this.replaceOrAddField(
          lines,
          "Expiration Time: ",
          newValue,
          "Issued At: "
        );
      case "notBefore":
        return this.replaceOrAddField(
          lines,
          "Not Before: ",
          newValue,
          "Expiration Time: "
        );
      case "requestId":
        return this.replaceOrAddField(
          lines,
          "Request ID: ",
          newValue,
          "Not Before: "
        );
      default:
        return message;
    }
  }

  /**
   * Replace the domain in the header line
   */
  private static replaceDomainField(lines: string[], newDomain: string): string {
    const headerRegex =
      /^(?:([a-zA-Z][a-zA-Z0-9+.-]*):(?:\/\/))?(.+) wants you to sign in with your Ethereum account:$/;

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(headerRegex);
      if (match) {
        const scheme = match[1] ? `${match[1]}://` : "";
        lines[i] = `${scheme}${newDomain} wants you to sign in with your Ethereum account:`;
        break;
      }
    }

    return lines.join("\n");
  }

  /**
   * Replace the Ethereum address (line 2, typically)
   */
  private static replaceAddressField(
    lines: string[],
    newAddress: string
  ): string {
    // Find the address line (should be after header and match address format)
    for (let i = 0; i < lines.length; i++) {
      if (/^0x[a-fA-F0-9]{40}$/.test(lines[i].trim())) {
        lines[i] = newAddress;
        break;
      }
    }

    return lines.join("\n");
  }

  /**
   * Replace the statement (if it exists)
   */
  private static replaceStatementField(
    lines: string[],
    newStatement: string
  ): string {
    let foundHeader = false;
    let foundAddress = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.includes("wants you to sign in with your Ethereum account:")) {
        foundHeader = true;
        continue;
      }

      if (foundHeader && /^0x[a-fA-F0-9]{40}$/.test(line.trim())) {
        foundAddress = true;
        continue;
      }

      if (foundAddress && line === "") {
        // Skip empty line after address
        continue;
      }

      if (foundAddress && !line.startsWith("URI:")) {
        // This is the statement line
        lines[i] = newStatement;
        break;
      }

      if (line.startsWith("URI:")) {
        // No statement found, we need to insert one
        // Insert empty line, statement, and empty line before URI
        lines.splice(i, 0, "", newStatement, "");
        break;
      }
    }

    return lines.join("\n");
  }

  /**
   * Replace a simple field (prefix: value format)
   */
  private static replaceSimpleField(
    lines: string[],
    prefix: string,
    newValue: string
  ): string {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith(prefix)) {
        lines[i] = prefix + newValue;
        return lines.join("\n");
      }
    }

    // Field not found - need to add it in the right position
    return lines.join("\n");
  }

  /**
   * Replace a field or add it if it doesn't exist
   */
  private static replaceOrAddField(
    lines: string[],
    prefix: string,
    newValue: string,
    afterPrefix: string
  ): string {
    // First, try to find and replace the existing field
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith(prefix)) {
        lines[i] = prefix + newValue;
        return lines.join("\n");
      }
    }

    // Field doesn't exist - add it after the specified field
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith(afterPrefix)) {
        lines.splice(i + 1, 0, prefix + newValue);
        return lines.join("\n");
      }
    }

    // Fallback: add at end
    lines.push(prefix + newValue);
    return lines.join("\n");
  }

  /**
   * Apply a fix to a specific field based on a validation error
   */
  public static applyFieldFix(
    message: string,
    error: ValidationError
  ): string | null {
    const parsed = SiweMessageParser.parse(message);
    const fields = parsed.fields;

    switch (error.code) {
      case "ADDRESS_NOT_CHECKSUM":
        if (fields.address) {
          const checksumAddress = this.toChecksumAddress(fields.address);
          return this.replaceField(message, "address", checksumAddress);
        }
        break;

      case "VERSION_INVALID":
      case "VERSION_REQUIRED":
        return this.replaceOrAddSimple(message, "Version: ", "1");

      case "NONCE_TOO_SHORT":
      case "NONCE_WEAK_ENTROPY":
      case "SECURITY_SHORT_NONCE":
      case "SECURITY_WEAK_NONCE_PATTERN":
      case "SECURITY_LOW_NONCE_COMPLEXITY":
        const newNonce = this.generateSecureNonce();
        return this.replaceField(message, "nonce", newNonce);

      case "NONCE_REQUIRED":
        return this.addFieldAfter(
          message,
          "Nonce: ",
          this.generateSecureNonce(),
          "Chain ID: "
        );

      case "URI_INSECURE_SCHEME":
        if (fields.uri && fields.uri.startsWith("http://")) {
          const secureUri = fields.uri.replace("http://", "https://");
          return this.replaceField(message, "uri", secureUri);
        }
        break;

      case "STATEMENT_LINE_BREAKS":
        if (fields.statement) {
          const cleanStatement = fields.statement
            .replace(/[\r\n]+/g, " ")
            .trim();
          return this.replaceField(message, "statement", cleanStatement);
        }
        break;

      case "SECURITY_NO_EXPIRATION":
        const expiration = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        return this.replaceOrAddField(
          message.split("\n"),
          "Expiration Time: ",
          expiration,
          "Issued At: "
        );

      case "ISSUED_AT_REQUIRED":
        return this.addFieldAfter(
          message,
          "Issued At: ",
          new Date().toISOString(),
          "Nonce: "
        );

      case "ISSUED_AT_INVALID_FORMAT":
        if (fields.issuedAt) {
          try {
            const fixed = new Date(fields.issuedAt).toISOString();
            return this.replaceField(message, "issuedAt", fixed);
          } catch {
            // Can't fix invalid date
          }
        }
        break;

      case "EXPIRATION_TIME_INVALID_FORMAT":
        if (fields.expirationTime) {
          try {
            const fixed = new Date(fields.expirationTime).toISOString();
            return this.replaceField(message, "expirationTime", fixed);
          } catch {
            // Can't fix invalid date
          }
        }
        break;
    }

    return null;
  }

  /**
   * Replace or add a simple field
   */
  private static replaceOrAddSimple(
    message: string,
    prefix: string,
    value: string
  ): string {
    const lines = message.split("\n");

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith(prefix)) {
        lines[i] = prefix + value;
        return lines.join("\n");
      }
    }

    // Find where to add the field based on prefix
    const fieldOrder = [
      "URI: ",
      "Version: ",
      "Chain ID: ",
      "Nonce: ",
      "Issued At: ",
      "Expiration Time: ",
      "Not Before: ",
      "Request ID: ",
    ];

    const prefixIndex = fieldOrder.indexOf(prefix);
    if (prefixIndex === -1) {
      lines.push(prefix + value);
      return lines.join("\n");
    }

    // Find the right position to insert
    for (let i = prefixIndex + 1; i < fieldOrder.length; i++) {
      const afterPrefix = fieldOrder[i];
      for (let j = 0; j < lines.length; j++) {
        if (lines[j].startsWith(afterPrefix)) {
          lines.splice(j, 0, prefix + value);
          return lines.join("\n");
        }
      }
    }

    // Add at end if no position found
    lines.push(prefix + value);
    return lines.join("\n");
  }

  /**
   * Add a field after another field
   */
  private static addFieldAfter(
    message: string,
    prefix: string,
    value: string,
    afterPrefix: string
  ): string {
    const lines = message.split("\n");

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith(afterPrefix)) {
        lines.splice(i + 1, 0, prefix + value);
        return lines.join("\n");
      }
    }

    // Fallback: add at end
    lines.push(prefix + value);
    return lines.join("\n");
  }

  /**
   * Generate a secure nonce
   */
  private static generateSecureNonce(): string {
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";

    for (let i = 0; i < 16; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }

    return result;
  }

  /**
   * Convert to checksum address (basic implementation)
   */
  private static toChecksumAddress(address: string): string {
    if (!address.startsWith("0x") || address.length !== 42) {
      return address;
    }

    const hex = address.slice(2).toLowerCase();
    let checksum = "";

    for (let i = 0; i < hex.length; i++) {
      const char = hex[i];
      if (/[0-9]/.test(char)) {
        checksum += char;
      } else {
        // Simple checksum logic
        const shouldBeUppercase = i % 2 === 0;
        checksum += shouldBeUppercase ? char.toUpperCase() : char.toLowerCase();
      }
    }

    return "0x" + checksum;
  }

  /**
   * Remove a field from the message
   */
  public static removeField(
    message: string,
    fieldName: keyof SiweMessageFields
  ): string {
    const lines = message.split("\n");
    const prefixMap: { [key: string]: string } = {
      expirationTime: "Expiration Time: ",
      notBefore: "Not Before: ",
      requestId: "Request ID: ",
    };

    const prefix = prefixMap[fieldName];
    if (!prefix) {
      return message; // Can only remove optional fields
    }

    const filteredLines = lines.filter((line) => !line.startsWith(prefix));
    return filteredLines.join("\n");
  }

  /**
   * Remove resources section from the message
   */
  public static removeResources(message: string): string {
    const lines = message.split("\n");
    const filteredLines: string[] = [];
    let inResources = false;

    for (const line of lines) {
      if (line.startsWith("Resources:")) {
        inResources = true;
        continue;
      }
      if (inResources && line.startsWith("- ")) {
        continue;
      }
      inResources = false;
      filteredLines.push(line);
    }

    return filteredLines.join("\n");
  }

  /**
   * Add a resource to the message
   */
  public static addResource(message: string, resource: string): string {
    const lines = message.split("\n");
    let resourcesIndex = -1;
    let lastResourceIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith("Resources:")) {
        resourcesIndex = i;
      } else if (resourcesIndex !== -1 && lines[i].startsWith("- ")) {
        lastResourceIndex = i;
      } else if (resourcesIndex !== -1 && !lines[i].startsWith("- ")) {
        break;
      }
    }

    if (resourcesIndex === -1) {
      // No resources section, add one
      lines.push("Resources:");
      lines.push(`- ${resource}`);
    } else {
      // Add after last resource
      const insertIndex = lastResourceIndex === -1 ? resourcesIndex + 1 : lastResourceIndex + 1;
      lines.splice(insertIndex, 0, `- ${resource}`);
    }

    return lines.join("\n");
  }
}

