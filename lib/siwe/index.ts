// SIWE (Sign in with Ethereum) Validator Library
// EIP-4361 Message Validation and Linting

// Core validation engine
export { ValidationEngine } from "./validationEngine";

// Parser for SIWE messages
export { SiweMessageParser } from "./parser";

// Field-level validators
export { FieldValidators } from "./validators";

// Security-focused validators
export { SecurityValidators } from "./securityValidators";

// Line break and formatting validator
export { LineBreakValidator } from "./lineBreakValidator";

// Auto-fixer for common issues
export { AutoFixer } from "./autoFixer";

// Targeted field replacement
export { FieldReplacer } from "./fieldReplacer";

// Type exports
export type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationSuggestion,
  SiweMessageFields,
  ParsedSiweMessage,
  ValidationRule,
  ValidationProfile,
  ValidationConfig,
  AutoFixResult,
  AddressValidation,
  TimeValidation,
  UriValidation,
  NonceValidation,
  DomainValidation,
} from "./types";

