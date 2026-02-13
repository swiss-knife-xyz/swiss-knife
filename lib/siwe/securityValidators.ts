// Security-focused validation rules for SIWE messages

import type { ValidationError, ParsedSiweMessage } from "./types";
import { SiweMessageParser } from "./parser";

export class SecurityValidators {
  // Comprehensive security validation
  static validateSecurity(message: ParsedSiweMessage): ValidationError[] {
    const errors: ValidationError[] = [];

    errors.push(...this.validateReplayProtection(message));
    errors.push(...this.validateDomainBinding(message));
    errors.push(...this.validateTimeBasedSecurity(message));
    errors.push(...this.validateNonceSecurity(message));
    errors.push(...this.validateResourceSecurity(message));
    errors.push(...this.validateOverallSecurity(message));

    return errors;
  }

  // Replay attack protection validation
  static validateReplayProtection(
    message: ParsedSiweMessage
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const { nonce, expirationTime } = message.fields;

    // Check for nonce presence and quality
    if (!nonce) {
      errors.push({
        type: "security",
        field: "nonce",
        line: SiweMessageParser.getFieldLine(message.rawMessage, "nonce"),
        column: 1,
        message: "Missing nonce - critical for replay attack prevention",
        severity: "error",
        fixable: true,
        suggestion: "Add a cryptographically secure random nonce",
        code: "SECURITY_NO_NONCE",
      });
    } else {
      // Check nonce entropy
      const uniqueChars = new Set(nonce).size;
      const entropy = uniqueChars / nonce.length;

      if (entropy < 0.5) {
        errors.push({
          type: "security",
          field: "nonce",
          line: SiweMessageParser.getFieldLine(message.rawMessage, "nonce"),
          column: 1,
          message: "Low nonce entropy increases replay attack risk",
          severity: "warning",
          fixable: true,
          suggestion: "Use a more random nonce with higher entropy",
          code: "SECURITY_LOW_NONCE_ENTROPY",
        });
      }

      // Check for predictable patterns
      if (this.isNoncePredictable(nonce)) {
        errors.push({
          type: "security",
          field: "nonce",
          line: SiweMessageParser.getFieldLine(message.rawMessage, "nonce"),
          column: 1,
          message: "Nonce appears predictable - security vulnerability",
          severity: "warning",
          fixable: true,
          suggestion: "Use cryptographically secure random generation",
          code: "SECURITY_PREDICTABLE_NONCE",
        });
      }
    }

    // Check for expiration time
    if (!expirationTime) {
      errors.push({
        type: "security",
        field: "expirationTime",
        line: SiweMessageParser.getFieldLine(
          message.rawMessage,
          "expirationTime"
        ),
        column: 1,
        message: "Missing expiration time - messages should have limited lifetime",
        severity: "warning",
        fixable: true,
        suggestion: "Add expiration time (5-15 minutes from issued at)",
        code: "SECURITY_NO_EXPIRATION",
      });
    }

    return errors;
  }

  // Domain binding security validation
  static validateDomainBinding(message: ParsedSiweMessage): ValidationError[] {
    const errors: ValidationError[] = [];
    const { domain, uri } = message.fields;

    if (!domain) {
      errors.push({
        type: "security",
        field: "domain",
        line: SiweMessageParser.getFieldLine(message.rawMessage, "domain"),
        column: 1,
        message: "Missing domain - critical for preventing phishing attacks",
        severity: "warning",
        fixable: false,
        suggestion: "Specify the domain requesting authentication",
        code: "SECURITY_NO_DOMAIN",
      });
      return errors;
    }

    // Check for suspicious domains
    if (this.isSuspiciousDomain(domain)) {
      errors.push({
        type: "security",
        field: "domain",
        line: SiweMessageParser.getFieldLine(message.rawMessage, "domain"),
        column: 1,
        message: "Domain appears suspicious - potential phishing risk",
        severity: "warning",
        fixable: false,
        suggestion: "Verify domain legitimacy and spelling",
        code: "SECURITY_SUSPICIOUS_DOMAIN",
      });
    }

    // Check domain-URI consistency
    if (uri) {
      try {
        const url = new URL(uri);
        const uriHostname = url.hostname;
        // Only use url.port if it's explicitly specified in the URI
        const uriPort = url.port || null;

        // Extract hostname and port from message domain (e.g., "example.com:3000" -> "example.com", "3000")
        let messageHostname = domain;
        let messagePort: string | null = null;

        const portMatch = domain.match(/^(.+):(\d+)$/);
        if (portMatch) {
          messageHostname = portMatch[1];
          messagePort = portMatch[2];
        }

        // Check hostname mismatch. The subdomain check requires the message domain
        // to have at least 2 parts (e.g., "example.com") to prevent a TLD like "com"
        // from matching "evil.com" via the endsWith check.
        const messageHasValidParent = messageHostname.split(".").length >= 2;
        const hostnameMismatch =
          messageHostname !== uriHostname &&
          !(
            messageHasValidParent &&
            uriHostname.endsWith(`.${messageHostname}`)
          );

        // Only check port mismatch if BOTH have explicit ports specified
        const portMismatch =
          messagePort && uriPort && messagePort !== uriPort;

        if (hostnameMismatch) {
          errors.push({
            type: "security",
            field: "uri",
            line: SiweMessageParser.getFieldLine(message.rawMessage, "uri"),
            column: 1,
            message: "URI domain does not match message domain - security risk",
            severity: "warning",
            fixable: false,
            suggestion:
              "Ensure URI domain matches or is subdomain of message domain",
            code: "SECURITY_DOMAIN_MISMATCH",
          });
        } else if (portMismatch) {
          errors.push({
            type: "security",
            field: "uri",
            line: SiweMessageParser.getFieldLine(message.rawMessage, "uri"),
            column: 1,
            message: `URI port (${uriPort}) does not match message domain port (${messagePort})`,
            severity: "warning",
            fixable: false,
            suggestion:
              "Ensure URI port matches the port specified in the domain",
            code: "SECURITY_PORT_MISMATCH",
          });
        }
      } catch {
        // URI validation will catch invalid URIs
      }
    }

    // Check for localhost/development domains in what appears to be production
    if (this.isDevelopmentDomain(domain)) {
      errors.push({
        type: "security",
        field: "domain",
        line: SiweMessageParser.getFieldLine(message.rawMessage, "domain"),
        column: 1,
        message: "Development domain detected - ensure this is not production",
        severity: "warning",
        fixable: false,
        suggestion: "Use production domain for production deployments",
        code: "SECURITY_DEVELOPMENT_DOMAIN",
      });
    }

    return errors;
  }

  // Time-based security validation
  static validateTimeBasedSecurity(
    message: ParsedSiweMessage
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const { issuedAt, expirationTime, notBefore } = message.fields;
    const now = new Date();

    // Validate issuedAt timing
    if (issuedAt) {
      try {
        const issuedDate = new Date(issuedAt);
        const timeDiff = Math.abs(now.getTime() - issuedDate.getTime());
        const oneHour = 60 * 60 * 1000;

        if (issuedDate > now) {
          errors.push({
            type: "security",
            field: "issuedAt",
            line: SiweMessageParser.getFieldLine(
              message.rawMessage,
              "issuedAt"
            ),
            column: 1,
            message:
              "Message issued in the future - clock skew or tampering risk",
            severity: "warning",
            fixable: false,
            suggestion: "Ensure server clock is accurate",
            code: "SECURITY_FUTURE_ISSUED_AT",
          });
        } else if (timeDiff > oneHour) {
          errors.push({
            type: "security",
            field: "issuedAt",
            line: SiweMessageParser.getFieldLine(
              message.rawMessage,
              "issuedAt"
            ),
            column: 1,
            message:
              "Message issued too far in the past - potential replay risk",
            severity: "warning",
            fixable: false,
            suggestion: "Generate fresh messages for authentication",
            code: "SECURITY_OLD_ISSUED_AT",
          });
        }
      } catch {
        // Timestamp format validation will catch invalid dates
      }
    }

    // Validate expiration security
    if (expirationTime) {
      try {
        const expDate = new Date(expirationTime);
        const issuedDate = issuedAt ? new Date(issuedAt) : now;
        const lifetime = expDate.getTime() - issuedDate.getTime();

        const oneDay = 24 * 60 * 60 * 1000;
        const twoMinutes = 2 * 60 * 1000;

        if (lifetime > oneDay) {
          errors.push({
            type: "security",
            field: "expirationTime",
            line: SiweMessageParser.getFieldLine(
              message.rawMessage,
              "expirationTime"
            ),
            column: 1,
            message: "Message lifetime too long - increases attack window",
            severity: "warning",
            fixable: false,
            suggestion: "Use shorter expiration times (5-15 minutes)",
            code: "SECURITY_LONG_LIFETIME",
          });
        } else if (lifetime < twoMinutes) {
          errors.push({
            type: "security",
            field: "expirationTime",
            line: SiweMessageParser.getFieldLine(
              message.rawMessage,
              "expirationTime"
            ),
            column: 1,
            message: "Message lifetime very short - may cause UX issues",
            severity: "info",
            fixable: false,
            suggestion: "Allow sufficient time for user interaction",
            code: "SECURITY_SHORT_LIFETIME",
          });
        }
      } catch {
        // Timestamp validation will catch format issues
      }
    }

    // Validate notBefore if present
    if (notBefore) {
      try {
        const notBeforeDate = new Date(notBefore);
        if (notBeforeDate > now) {
          errors.push({
            type: "security",
            field: "notBefore",
            line: SiweMessageParser.getFieldLine(
              message.rawMessage,
              "notBefore"
            ),
            column: 1,
            message: "Message not yet valid - check notBefore timing",
            severity: "warning",
            fixable: false,
            suggestion: "Ensure notBefore time is appropriate",
            code: "SECURITY_NOT_YET_VALID",
          });
        }
      } catch {
        // Timestamp validation will catch format issues
      }
    }

    return errors;
  }

  // Enhanced nonce security validation
  static validateNonceSecurity(message: ParsedSiweMessage): ValidationError[] {
    const errors: ValidationError[] = [];
    const nonce = message.fields.nonce;

    if (!nonce) return errors; // Handled by other validators

    const line = SiweMessageParser.getFieldLine(message.rawMessage, "nonce");

    // Check minimum length for security
    if (nonce.length < 12) {
      errors.push({
        type: "security",
        field: "nonce",
        line,
        column: 1,
        message: "Nonce should be at least 12 characters for better security",
        severity: "warning",
        fixable: true,
        suggestion: "Use longer nonces (16+ characters recommended)",
        code: "SECURITY_SHORT_NONCE",
      });
    }

    // Check for common weak patterns
    const weakPatterns = [
      /^(test|demo|example)/i,
      /^(123|abc|000)/,
      /^(.)\1{4,}/, // Repeated characters
      /^\d+$/, // Only numbers
      /^[a-z]+$/i, // Only letters
    ];

    for (const pattern of weakPatterns) {
      if (pattern.test(nonce)) {
        errors.push({
          type: "security",
          field: "nonce",
          line,
          column: 1,
          message: "Nonce contains weak patterns - security vulnerability",
          severity: "warning",
          fixable: true,
          suggestion: "Use cryptographically secure random generation",
          code: "SECURITY_WEAK_NONCE_PATTERN",
        });
        break;
      }
    }

    // Check character distribution
    const charTypes = {
      lowercase: /[a-z]/.test(nonce),
      uppercase: /[A-Z]/.test(nonce),
      numbers: /\d/.test(nonce),
      special: /[^a-zA-Z0-9]/.test(nonce),
    };

    const typeCount = Object.values(charTypes).filter(Boolean).length;
    if (typeCount < 2) {
      errors.push({
        type: "security",
        field: "nonce",
        line,
        column: 1,
        message: "Nonce should use mixed character types for better entropy",
        severity: "warning",
        fixable: true,
        suggestion: "Include mix of letters and numbers",
        code: "SECURITY_LOW_NONCE_COMPLEXITY",
      });
    }

    return errors;
  }

  // Resource security validation
  static validateResourceSecurity(
    message: ParsedSiweMessage
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const resources = message.fields.resources;

    if (!resources || resources.length === 0) {
      return errors; // Resources are optional
    }

    resources.forEach((resource, index) => {
      const line =
        SiweMessageParser.getFieldLine(message.rawMessage, "resources") +
        index +
        1;

      try {
        const url = new URL(resource);

        // Check for insecure protocols
        if (url.protocol === "http:") {
          errors.push({
            type: "security",
            field: "resources",
            line,
            column: 1,
            message: `Resource ${index + 1} uses insecure HTTP protocol`,
            severity: "warning",
            fixable: true,
            suggestion: "Use HTTPS for secure resource access",
            code: "SECURITY_INSECURE_RESOURCE",
          });
        }

        // Check for suspicious domains in resources
        if (this.isSuspiciousDomain(url.hostname)) {
          errors.push({
            type: "security",
            field: "resources",
            line,
            column: 1,
            message: `Resource ${index + 1} domain appears suspicious`,
            severity: "warning",
            fixable: false,
            suggestion: "Verify resource domain legitimacy",
            code: "SECURITY_SUSPICIOUS_RESOURCE_DOMAIN",
          });
        }

        // Check for overly broad resource access
        if (url.pathname === "/" || url.pathname === "/*") {
          errors.push({
            type: "security",
            field: "resources",
            line,
            column: 1,
            message: `Resource ${index + 1} grants very broad access`,
            severity: "warning",
            fixable: false,
            suggestion: "Use specific resource paths instead of wildcards",
            code: "SECURITY_BROAD_RESOURCE_ACCESS",
          });
        }
      } catch {
        errors.push({
          type: "security",
          field: "resources",
          line,
          column: 1,
          message: `Resource ${index + 1} is not a valid URI`,
          severity: "warning",
          fixable: false,
          suggestion: "Ensure resource is a valid URI",
          code: "SECURITY_INVALID_RESOURCE_URI",
        });
      }
    });

    // Check for too many resources
    if (resources.length > 10) {
      errors.push({
        type: "security",
        field: "resources",
        line: SiweMessageParser.getFieldLine(message.rawMessage, "resources"),
        column: 1,
        message: "Large number of resources may indicate over-permissioning",
        severity: "warning",
        fixable: false,
        suggestion: "Consider reducing scope of requested access",
        code: "SECURITY_TOO_MANY_RESOURCES",
      });
    }

    return errors;
  }

  // Overall security posture validation
  static validateOverallSecurity(
    message: ParsedSiweMessage
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const { domain, uri, expirationTime, nonce } = message.fields;

    // Check for minimum security baseline
    const hasSecureTransport = uri && uri.startsWith("https://");
    const hasExpiration = !!expirationTime;
    const hasStrongNonce = nonce && nonce.length >= 12;

    const securityScore = [
      hasSecureTransport,
      hasExpiration,
      hasStrongNonce,
    ].filter(Boolean).length;

    if (securityScore < 2) {
      errors.push({
        type: "security",
        field: "overall",
        line: 1,
        column: 1,
        message: "Message lacks basic security features",
        severity: "warning",
        fixable: false,
        suggestion: "Implement HTTPS, expiration times, and strong nonces",
        code: "SECURITY_LOW_BASELINE",
      });
    }

    // Check for development/testing indicators
    const testingIndicators = [
      domain?.includes("test"),
      domain?.includes("dev"),
      domain?.includes("localhost"),
      uri?.includes("localhost"),
      nonce?.toLowerCase().includes("test"),
    ].filter(Boolean).length;

    if (testingIndicators > 0) {
      errors.push({
        type: "security",
        field: "overall",
        line: 1,
        column: 1,
        message: "Message contains development/testing indicators",
        severity: "info",
        fixable: false,
        suggestion: "Ensure production configuration for live deployment",
        code: "SECURITY_TESTING_INDICATORS",
      });
    }

    return errors;
  }

  // Helper methods for security checks

  private static isNoncePredictable(nonce: string): boolean {
    // Check for sequential patterns
    const sequences = [
      "01234567890",
      "abcdefghijk",
      "12345678",
      "aaaaaaaa",
      "00000000",
    ];

    return sequences.some((seq) => nonce.toLowerCase().includes(seq));
  }

  private static isSuspiciousDomain(domain: string): boolean {
    // Extract hostname from domain (remove port if present)
    let hostname = domain;
    const portMatch = domain.match(/^(.+):(\d+)$/);
    if (portMatch) {
      hostname = portMatch[1];
    }

    const suspiciousPatterns = [
      /metamask.*\.(?!io$)/i, // Fake MetaMask domains
      /wallet.*connect/i, // Fake WalletConnect
      /ethereum.*wallet/i, // Suspicious wallet domains
      /crypto.*app/i, // Generic crypto apps
      /defi.*swap/i, // Suspicious DeFi names
      /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/, // IP addresses
      /[a-z]{20,}\.com/i, // Very long random domains
      /[0-9]{8,}\./, // Domains with long numbers
    ];

    return suspiciousPatterns.some((pattern) => pattern.test(hostname));
  }

  private static isDevelopmentDomain(domain: string): boolean {
    // Extract hostname from domain (remove port if present)
    let hostname = domain;
    const portMatch = domain.match(/^(.+):(\d+)$/);
    if (portMatch) {
      hostname = portMatch[1];
    }

    const devPatterns = [
      "localhost",
      "127.0.0.1",
      "0.0.0.0",
      "::1",
      ".local",
      ".test",
      ".dev",
      "staging.",
      "dev.",
      "test.",
    ];

    return devPatterns.some((pattern) => hostname.includes(pattern));
  }
}

