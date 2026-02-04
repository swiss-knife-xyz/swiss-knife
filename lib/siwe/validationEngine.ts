// Main validation engine that orchestrates all validators

import type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationSuggestion,
  ValidationProfile,
  ValidationConfig,
  ParsedSiweMessage,
} from "./types";
import { SiweMessageParser } from "./parser";
import { FieldValidators } from "./validators";
import { SecurityValidators } from "./securityValidators";
import { AutoFixer } from "./autoFixer";
import { LineBreakValidator } from "./lineBreakValidator";

export class ValidationEngine {
  // Default validation profiles
  public static readonly PROFILES: { [key: string]: ValidationProfile } = {
    strict: {
      name: "Strict EIP-4361 Compliance",
      description:
        "Full compliance with EIP-4361 specification including all security best practices",
      strictMode: true,
      rules: [], // Will be populated with all validators
    },

    development: {
      name: "Development Mode",
      description:
        "Relaxed validation for development and testing environments",
      strictMode: false,
      rules: [], // Will be populated with relaxed validators
    },

    security: {
      name: "Security Focused",
      description:
        "Enhanced security validation with additional checks for production use",
      strictMode: true,
      rules: [], // Will be populated with security-focused validators
    },

    basic: {
      name: "Basic Validation",
      description:
        "Essential validation for message format and required fields only",
      strictMode: false,
      rules: [], // Will be populated with basic validators
    },
  };

  // Main validation method
  public static validate(
    message: string,
    config?: Partial<ValidationConfig>
  ): ValidationResult {
    const defaultConfig: ValidationConfig = {
      profile: this.PROFILES.strict,
      realTimeValidation: false,
      autoFix: false,
      maxMessageSize: 10240, // 10KB
    };

    const finalConfig = { ...defaultConfig, ...config };

    // Check message size
    if (message.length > finalConfig.maxMessageSize) {
      return {
        isValid: false,
        errors: [
          {
            type: "format",
            field: "message",
            line: 1,
            column: 1,
            message: `Message too large (${message.length} bytes, max ${finalConfig.maxMessageSize})`,
            severity: "error",
            fixable: false,
            code: "MESSAGE_TOO_LARGE",
          },
        ],
        warnings: [],
        suggestions: [],
        originalMessage: message,
      };
    }

    // Check line break and formatting issues first
    const lineBreakErrors = LineBreakValidator.validateLineBreaks(message);

    // Parse the message
    const parsedMessage = SiweMessageParser.parse(message);

    // Collect all validation errors
    const allErrors: ValidationError[] = [];

    // Add line break errors first (they often explain parsing issues)
    allErrors.push(...lineBreakErrors);

    // Add parse errors
    allErrors.push(...parsedMessage.parseErrors);

    // Run field validations if parsing was successful enough
    if (parsedMessage.fields && Object.keys(parsedMessage.fields).length > 0) {
      allErrors.push(...this.runFieldValidations(parsedMessage));

      // Run security validations based on profile
      if (
        finalConfig.profile.strictMode ||
        finalConfig.profile.name.includes("Security")
      ) {
        allErrors.push(...this.runSecurityValidations(parsedMessage));
      }
    }

    // Apply profile-specific filtering
    const filteredErrors = this.applyProfileFiltering(
      allErrors,
      finalConfig.profile
    );

    // Separate errors by severity
    const errors = filteredErrors.filter((e) => e.severity === "error");
    const warnings = filteredErrors.filter(
      (e) => e.severity === "warning"
    ) as ValidationError[];
    const suggestions = filteredErrors.filter(
      (e) => e.severity === "info"
    ) as ValidationError[];

    // Apply auto-fix if requested and there are fixable errors
    let fixedMessage: string | undefined;
    if (finalConfig.autoFix && filteredErrors.some((e) => e.fixable)) {
      const fixResult = AutoFixer.fixMessage(parsedMessage, filteredErrors);
      if (fixResult.fixed) {
        fixedMessage = fixResult.message;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings as ValidationWarning[],
      suggestions: suggestions as ValidationSuggestion[],
      fixedMessage,
      originalMessage: message,
    };
  }

  // Run all field-level validations
  private static runFieldValidations(
    parsedMessage: ParsedSiweMessage
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Required field validations
    errors.push(...FieldValidators.validateDomain(parsedMessage));
    errors.push(...FieldValidators.validateAddress(parsedMessage));
    errors.push(...FieldValidators.validateUri(parsedMessage));
    errors.push(...FieldValidators.validateVersion(parsedMessage));
    errors.push(...FieldValidators.validateChainId(parsedMessage));
    errors.push(...FieldValidators.validateNonce(parsedMessage));
    errors.push(...FieldValidators.validateIssuedAt(parsedMessage));

    // Optional field validations
    errors.push(...FieldValidators.validateExpirationTime(parsedMessage));
    errors.push(...FieldValidators.validateStatement(parsedMessage));

    return errors;
  }

  // Run security-focused validations
  private static runSecurityValidations(
    parsedMessage: ParsedSiweMessage
  ): ValidationError[] {
    return SecurityValidators.validateSecurity(parsedMessage);
  }

  // Apply profile-specific filtering to validation results
  private static applyProfileFiltering(
    errors: ValidationError[],
    profile: ValidationProfile
  ): ValidationError[] {
    switch (profile.name) {
      case "Development Mode":
        // Filter out some security warnings in development
        return errors.filter(
          (error) =>
            !(
              error.code === "SECURITY_DEVELOPMENT_DOMAIN" ||
              error.code === "SECURITY_TESTING_INDICATORS" ||
              (error.type === "security" && error.severity === "warning")
            )
        );

      case "Basic Validation":
        // Only format errors and critical security issues
        return errors.filter(
          (error) =>
            error.type === "format" ||
            (error.type === "security" && error.severity === "error")
        );

      case "Security Focused":
        // Include all errors and promote some warnings to errors
        return errors.map((error) => {
          if (error.type === "security" && error.severity === "warning") {
            return { ...error, severity: "error" as const };
          }
          return error;
        });

      default: // Strict mode
        return errors;
    }
  }

  // Quick validation for real-time feedback (lighter validation)
  public static quickValidate(message: string): {
    hasErrors: boolean;
    errorCount: number;
    warningCount: number;
    isComplete: boolean;
  } {
    if (!message.trim()) {
      return { hasErrors: false, errorCount: 0, warningCount: 0, isComplete: false };
    }

    const parsedMessage = SiweMessageParser.parse(message);
    const errors = this.runFieldValidations(parsedMessage);

    const errorCount = errors.filter((e) => e.severity === "error").length;
    const warningCount = errors.filter((e) => e.severity === "warning").length;

    // Check if message appears complete (has minimum required structure)
    const isComplete = !!(
      parsedMessage.fields.domain &&
      parsedMessage.fields.address &&
      parsedMessage.fields.uri &&
      parsedMessage.fields.version &&
      parsedMessage.fields.chainId &&
      parsedMessage.fields.nonce &&
      parsedMessage.fields.issuedAt
    );

    return {
      hasErrors: errorCount > 0,
      errorCount,
      warningCount,
      isComplete,
    };
  }

  // Validate specific field only
  public static validateField(
    message: string,
    fieldName: string
  ): ValidationError[] {
    const parsedMessage = SiweMessageParser.parse(message);

    switch (fieldName) {
      case "domain":
        return FieldValidators.validateDomain(parsedMessage);
      case "address":
        return FieldValidators.validateAddress(parsedMessage);
      case "uri":
        return FieldValidators.validateUri(parsedMessage);
      case "version":
        return FieldValidators.validateVersion(parsedMessage);
      case "chainId":
        return FieldValidators.validateChainId(parsedMessage);
      case "nonce":
        return FieldValidators.validateNonce(parsedMessage);
      case "issuedAt":
        return FieldValidators.validateIssuedAt(parsedMessage);
      case "expirationTime":
        return FieldValidators.validateExpirationTime(parsedMessage);
      case "statement":
        return FieldValidators.validateStatement(parsedMessage);
      default:
        return [];
    }
  }

  // Get validation statistics
  public static getValidationStats(result: ValidationResult): {
    totalIssues: number;
    errorCount: number;
    warningCount: number;
    suggestionCount: number;
    fixableCount: number;
    securityIssues: number;
    complianceIssues: number;
    formatIssues: number;
  } {
    const allIssues = [
      ...result.errors,
      ...result.warnings,
      ...result.suggestions,
    ];

    return {
      totalIssues: allIssues.length,
      errorCount: result.errors.length,
      warningCount: result.warnings.length,
      suggestionCount: result.suggestions.length,
      fixableCount: allIssues.filter((issue) => issue.fixable).length,
      securityIssues: allIssues.filter((issue) => issue.type === "security")
        .length,
      complianceIssues: allIssues.filter((issue) => issue.type === "compliance")
        .length,
      formatIssues: allIssues.filter((issue) => issue.type === "format").length,
    };
  }

  // Generate sample messages for testing
  public static generateSamples(): { [key: string]: string } {
    return {
      // Per EIP-4361: 2 empty lines when no statement
      minimal: `example.com wants you to sign in with your Ethereum account:
0x742d35Cc6C4C1Ca5d428d9eE0e9B1E1234567890


URI: https://example.com
Version: 1
Chain ID: 1
Nonce: abcdef123456
Issued At: ${new Date().toISOString()}`,

      withResources: AutoFixer.generateTemplate({
        domain: "app.example.com",
        address: "0x742d35Cc6C4C1Ca5d428d9eE0e9B1E1234567890",
        statement: "Sign in to our Web3 application.",
        uri: "https://app.example.com/auth",
        chainId: "137", // Polygon
        resources: [
          "https://api.example.com/user",
          "https://storage.example.com/files",
        ],
      }),
    };
  }

  // Batch validation for multiple messages
  public static batchValidate(
    messages: string[],
    config?: Partial<ValidationConfig>
  ): ValidationResult[] {
    return messages.map((message) => this.validate(message, config));
  }

  // Export validation report
  public static exportReport(result: ValidationResult): {
    summary: {
      isValid: boolean;
      timestamp: string;
      messageLength: number;
      statistics: ReturnType<typeof ValidationEngine.getValidationStats>;
    };
    details: {
      errors: Array<{
        type: string;
        field: string;
        line: number;
        message: string;
        code: string;
        fixable: boolean;
      }>;
      warnings: Array<{
        type: string;
        field: string;
        line: number;
        message: string;
        code: string;
      }>;
      suggestions: Array<{
        field: string;
        message: string;
        suggestion?: string;
      }>;
    };
    fixSuggestions: string[];
  } {
    const stats = this.getValidationStats(result);

    const summary = {
      isValid: result.isValid,
      timestamp: new Date().toISOString(),
      messageLength: result.originalMessage.length,
      statistics: stats,
    };

    const details = {
      errors: result.errors.map((error) => ({
        type: error.type,
        field: error.field,
        line: error.line,
        message: error.message,
        code: error.code,
        fixable: error.fixable,
      })),
      warnings: result.warnings.map((warning) => ({
        type: warning.type,
        field: warning.field,
        line: warning.line,
        message: warning.message,
        code: warning.code,
      })),
      suggestions: result.suggestions.map((suggestion) => ({
        field: suggestion.field,
        message: suggestion.message,
        suggestion: suggestion.suggestion,
      })),
    };

    const fixSuggestions = [
      ...result.errors
        .filter((e) => e.fixable)
        .map((e) => e.suggestion || "Apply auto-fix"),
      ...result.warnings.filter((w) => w.suggestion).map((w) => w.suggestion!),
    ].filter(Boolean);

    return { summary, details, fixSuggestions };
  }
}

