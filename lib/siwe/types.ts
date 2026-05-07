// Core types for SIWE message validation engine

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
  fixedMessage?: string;
  originalMessage: string;
}

export interface ValidationError {
  type: "format" | "security" | "compliance";
  field: string;
  line: number;
  column: number;
  message: string;
  severity: "error" | "warning" | "info";
  fixable: boolean;
  suggestion?: string;
  code: string; // Error code for programmatic handling
}

export interface ValidationWarning extends ValidationError {
  severity: "warning";
}

export interface ValidationSuggestion extends ValidationError {
  severity: "info";
}

export interface SiweMessageFields {
  scheme?: string; // Optional scheme from the header (e.g., "https")
  domain?: string; // Domain with optional port (e.g., "example.com:3000")
  address?: string;
  statement?: string;
  uri?: string;
  version?: string;
  chainId?: string;
  nonce?: string;
  issuedAt?: string;
  expirationTime?: string;
  notBefore?: string;
  requestId?: string;
  resources?: string[];
}

export interface ParsedSiweMessage {
  fields: SiweMessageFields;
  lines: string[];
  rawMessage: string;
  isValid: boolean;
  parseErrors: ValidationError[];
}

export interface ValidationRule {
  name: string;
  type: "format" | "security" | "compliance";
  severity: "error" | "warning" | "info";
  validate: (message: ParsedSiweMessage) => ValidationError[];
  fix?: (message: ParsedSiweMessage) => string | null;
}

export interface ValidationProfile {
  name: string;
  description: string;
  rules: ValidationRule[];
  strictMode: boolean;
}

export interface ValidationConfig {
  profile: ValidationProfile;
  realTimeValidation: boolean;
  autoFix: boolean;
  maxMessageSize: number;
}

export interface AutoFixResult {
  fixed: boolean;
  message: string;
  appliedFixes: string[];
  remainingIssues: ValidationError[];
}

// Ethereum address validation types
export interface AddressValidation {
  isValid: boolean;
  isChecksum: boolean;
  format: "lowercase" | "uppercase" | "mixed" | "checksum";
}

// Time-based validation types
export interface TimeValidation {
  isValid: boolean;
  format: string;
  timestamp: Date | null;
  timezone: string | null;
}

// URI validation types
export interface UriValidation {
  isValid: boolean;
  scheme: string | null;
  authority: string | null;
  path: string | null;
  query: string | null;
  fragment: string | null;
}

// Nonce validation types
export interface NonceValidation {
  isValid: boolean;
  length: number;
  entropy: number;
  pattern: "random" | "sequential" | "predictable" | "weak";
}

// Domain validation types
export interface DomainValidation {
  isValid: boolean;
  isSubdomain: boolean;
  tld: string | null;
  securityRisk: "none" | "low" | "medium" | "high";
}

