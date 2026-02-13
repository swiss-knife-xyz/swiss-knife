"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createParser, useQueryState } from "next-usequerystate";

// Custom parser for SIWE messages that handles newlines via base64 encoding
const parseAsBase64Message = createParser({
  parse: (value: string) => {
    try {
      return atob(value);
    } catch {
      return "";
    }
  },
  serialize: (value: string) => btoa(value),
}).withDefault("");

import {
  Box,
  VStack,
  HStack,
  Textarea,
  Button,
  Heading,
  Text,
  useToast,
  Grid,
  GridItem,
  FormControl,
  FormLabel,
  Switch,
  Tooltip,
  IconButton,
  Divider,
  Input,
  InputGroup,
  InputRightElement,
  Collapse,
} from "@chakra-ui/react";
import {
  CopyIcon,
  DeleteIcon,
  DownloadIcon,
  CheckIcon,
  EditIcon,
  LinkIcon,
} from "@chakra-ui/icons";
import { useAccount, useSignMessage, useChainId } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { verifyMessage } from "viem";
import {
  ValidationEngine,
  FieldReplacer,
  AutoFixer,
  SiweMessageParser,
  type ValidationResult,
  type ValidationError,
} from "@/lib/siwe";
import { ValidationResults } from "./ValidationResults";

interface SiweValidatorProps {
  initialMessage?: string;
}

export const SiweValidator = ({ initialMessage = "" }: SiweValidatorProps) => {
  // URL state for message persistence/sharing (base64 encoded to preserve newlines)
  const [message, setMessage] = useQueryState("message", parseAsBase64Message);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRealTimeValidation, setIsRealTimeValidation] = useState(true);
  const [signature, setSignature] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const toast = useToast({ position: "top" });

  // Wagmi hooks for wallet interaction
  const { address: connectedAddress, isConnected } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync, isPending: isSigningPending } = useSignMessage();
  const { openConnectModal } = useConnectModal();

  // Real-time validation with debounce
  useEffect(() => {
    if (!isRealTimeValidation || !message.trim()) {
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      handleValidate(false);
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [message, isRealTimeValidation]);

  const handleValidate = useCallback(
    (showToast = true) => {
      if (!message.trim()) {
        if (showToast) {
          toast({
            title: "No message to validate",
            description: "Please enter a SIWE message first",
            status: "warning",
            duration: 3000,
            isClosable: true,
          });
        }
        return;
      }

      setIsLoading(true);

      // Small delay to show loading state
      setTimeout(() => {
        try {
          const validationResult = ValidationEngine.validate(message);

          setResult(validationResult);

          if (showToast) {
            if (validationResult.isValid) {
              toast({
                title: "Valid",
                description: "Message complies with EIP-4361",
                status: "success",
                duration: 3000,
                isClosable: true,
              });
            } else {
              toast({
                title: "Invalid",
                description: `${validationResult.errors.length} error(s) found`,
                status: "error",
                duration: 3000,
                isClosable: true,
              });
            }
          }
        } catch (error) {
          console.error("Validation error:", error);
          toast({
            title: "Validation Error",
            description:
              error instanceof Error
                ? error.message
                : "An unexpected error occurred",
            status: "error",
            duration: 4000,
            isClosable: true,
          });
        } finally {
          setIsLoading(false);
        }
      }, 100);
    },
    [message, toast]
  );

  const handleFixIssue = useCallback(
    (issue: ValidationError) => {
      const fixedMessage = FieldReplacer.applyFieldFix(message, issue);

      if (fixedMessage) {
        setMessage(fixedMessage);
        toast({
          title: "Fix Applied",
          description: `Fixed: ${issue.field}`,
          status: "success",
          duration: 2000,
          isClosable: true,
        });

        // Re-validate with the fixed message directly
        setTimeout(() => {
          const validationResult = ValidationEngine.validate(fixedMessage);
          setResult(validationResult);
        }, 50);
      } else {
        toast({
          title: "Could not apply fix",
          description: "This issue requires manual correction",
          status: "warning",
          duration: 3000,
          isClosable: true,
        });
      }
    },
    [message, toast]
  );

  const handleFixAll = useCallback(() => {
    if (!result) return;

    const allIssues = [
      ...result.errors,
      ...result.warnings,
      ...result.suggestions,
    ];
    const fixableIssues = allIssues.filter((i) => i.fixable);

    if (fixableIssues.length === 0) {
      toast({
        title: "No fixable issues",
        description: "All issues require manual correction",
        status: "info",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const parsed = SiweMessageParser.parse(message);
    // Guard against parse failures — if the message is too malformed to parse,
    // AutoFixer.fixMessage() would throw on a null/empty fields object.
    if (!parsed || !parsed.fields || Object.keys(parsed.fields).length === 0) {
      toast({
        title: "Cannot Auto-Fix",
        description: "Message is too malformed to parse. Fix structural issues first.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    const fixResult = AutoFixer.fixMessage(parsed, allIssues);

    if (fixResult.fixed) {
      setMessage(fixResult.message);
      toast({
        title: "Fixes Applied",
        description: `Applied ${fixResult.appliedFixes.length} fix(es)`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      // Re-validate with the fixed message directly
      setTimeout(() => {
        const validationResult = ValidationEngine.validate(fixResult.message);
        setResult(validationResult);
      }, 50);
    }
  }, [message, result, toast]);

  const handleClear = useCallback(() => {
    setMessage("");
    setResult(null);
    setSignature(null);
    setVerificationResult(null);
  }, []);

  const handleCopyMessage = useCallback(() => {
    navigator.clipboard.writeText(message);
    toast({
      title: "Copied to clipboard",
      status: "success",
      duration: 2000,
      isClosable: true,
    });
  }, [message, toast]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link copied",
      description: "Share this URL to share the message",
      status: "success",
      duration: 2000,
      isClosable: true,
    });
  }, [toast]);

  const handleLoadSample = useCallback(
    (sampleKey: string) => {
      const samples = ValidationEngine.generateSamples();
      const sample = samples[sampleKey];
      if (sample) {
        setMessage(sample);
        setResult(null);
        setSignature(null);
        setVerificationResult(null);
        toast({
          title: "Sample loaded",
          description: `Loaded "${sampleKey}" sample message`,
          status: "info",
          duration: 2000,
          isClosable: true,
        });
      }
    },
    [toast]
  );

  // Auto-fill message with connected wallet address
  const handleAutoFill = useCallback(() => {
    if (!connectedAddress) {
      toast({
        title: "No wallet connected",
        description: "Connect your wallet first to auto-fill",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // If no message exists, generate a new one
    if (!message.trim()) {
      const domain = typeof window !== "undefined" ? window.location.host : "example.com";
      const uri = typeof window !== "undefined" ? window.location.origin : "https://example.com";
      const now = new Date();
      const expiration = new Date(now.getTime() + 10 * 60 * 1000);
      const nonce = Math.random().toString(36).substring(2, 18) + Math.random().toString(36).substring(2, 18);

      const autoMessage = `${domain} wants you to sign in with your Ethereum account:
${connectedAddress}

Sign in with Ethereum

URI: ${uri}
Version: 1
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${now.toISOString()}
Expiration Time: ${expiration.toISOString()}`;

      setMessage(autoMessage);
      setResult(null);
      setSignature(null);
      setVerificationResult(null);
      toast({
        title: "Message generated",
        description: "New SIWE message created with your wallet",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    // Update existing message - replace domain, address, and URI
    let updatedMessage = message;
    const updates: string[] = [];
    const parsed = SiweMessageParser.parse(message);

    // Replace domain (first line)
    const currentDomain = typeof window !== "undefined" ? window.location.host : null;
    if (currentDomain && parsed.fields.domain && parsed.fields.domain !== currentDomain) {
      updatedMessage = FieldReplacer.replaceField(updatedMessage, "domain", currentDomain);
      updates.push("domain");
    }

    // Replace address
    if (parsed.fields.address) {
      if (parsed.fields.address.toLowerCase() !== connectedAddress.toLowerCase()) {
        updatedMessage = FieldReplacer.replaceField(updatedMessage, "address", connectedAddress);
        updates.push("address");
      }
    }

    // Replace URI with current origin
    const currentUri = typeof window !== "undefined" ? window.location.origin : null;
    if (currentUri && parsed.fields.uri && parsed.fields.uri !== currentUri) {
      updatedMessage = FieldReplacer.replaceField(updatedMessage, "uri", currentUri);
      updates.push("URI");
    }

    if (updates.length > 0) {
      setMessage(updatedMessage);
      setResult(null);
      setSignature(null);
      setVerificationResult(null);
      toast({
        title: "Message updated",
        description: `Updated: ${updates.join(", ")}`,
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    } else {
      toast({
        title: "Already up to date",
        description: "Address and URI already match",
        status: "info",
        duration: 2000,
        isClosable: true,
      });
    }
  }, [connectedAddress, chainId, message, toast]);

  // Sign the SIWE message
  const handleSign = useCallback(async () => {
    if (!isConnected) {
      openConnectModal?.();
      return;
    }

    if (!message.trim()) {
      toast({
        title: "No message to sign",
        description: "Enter or generate a SIWE message first",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Warn if address doesn't match but don't modify
    const parsed = SiweMessageParser.parse(message);
    if (parsed.fields.address && connectedAddress) {
      if (parsed.fields.address.toLowerCase() !== connectedAddress.toLowerCase()) {
        toast({
          title: "Address mismatch",
          description: "Use Auto-fill to update the address to match your wallet",
          status: "warning",
          duration: 4000,
          isClosable: true,
        });
        return; // Don't sign with mismatched address
      }
    }

    try {
      const sig = await signMessageAsync({ message });
      setSignature(sig);
      setVerificationResult(null);
      toast({
        title: "Message signed",
        description: "Signature generated successfully",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Signing error:", error);
      const isRejection = error instanceof Error && error.message.toLowerCase().includes("rejected");
      toast({
        title: isRejection ? "Signature rejected" : "Signing failed",
        description: isRejection ? "You rejected the signature request" : "Failed to sign message",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  }, [isConnected, message, connectedAddress, signMessageAsync, openConnectModal, toast]);

  // Verify a signature
  const handleVerify = useCallback(async () => {
    if (!signature || !message.trim()) {
      toast({
        title: "Missing data",
        description: "Need both message and signature to verify",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const parsed = SiweMessageParser.parse(message);
    if (!parsed.fields.address) {
      toast({
        title: "Invalid message",
        description: "Message doesn't contain a valid address",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsVerifying(true);
    try {
      const isValid = await verifyMessage({
        address: parsed.fields.address as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      });
      setVerificationResult(isValid);
      toast({
        title: isValid ? "Valid signature" : "Invalid signature",
        description: isValid
          ? "The signature is valid for this message and address"
          : "The signature does not match",
        status: isValid ? "success" : "error",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Verification error:", error);
      setVerificationResult(false);
      toast({
        title: "Verification failed",
        description: "Could not verify the signature",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsVerifying(false);
    }
  }, [signature, message, toast]);

  const handleCopySignature = useCallback(() => {
    if (signature) {
      navigator.clipboard.writeText(signature);
      toast({
        title: "Signature copied",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    }
  }, [signature, toast]);

  // Quick status indicator
  const getQuickStatus = () => {
    if (!message.trim()) return null;
    const quick = ValidationEngine.quickValidate(message);
    return quick;
  };

  const quickStatus = getQuickStatus();

  return (
    <Box w="full">
      <Grid
        templateColumns={{ base: "1fr", lg: "1fr 1fr" }}
        gap={8}
        alignItems="start"
      >
        {/* Input Panel */}
        <GridItem>
          <VStack spacing={4} align="stretch">
            {/* Header Row - matches Results panel height */}
            <HStack justify="space-between" minH="32px">
              <Heading size="md" color="whiteAlpha.900">
                SIWE Message Input
              </Heading>
            </HStack>

            {/* Controls Row */}
            <HStack justify="space-between" flexWrap="wrap" gap={2}>
              <HStack spacing={2}>
                <Button
                  size="sm"
                  variant="outline"
                  color="white"
                  borderColor="whiteAlpha.400"
                  _hover={{ bg: "whiteAlpha.100" }}
                  onClick={() => handleLoadSample("minimal")}
                >
                  Minimal
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  color="white"
                  borderColor="whiteAlpha.400"
                  _hover={{ bg: "whiteAlpha.100" }}
                  onClick={() => handleLoadSample("full")}
                >
                  Full
                </Button>
              </HStack>

              <HStack spacing={2}>
                <Tooltip label="Copy message" placement="top">
                  <IconButton
                    aria-label="Copy message"
                    icon={<CopyIcon />}
                    size="sm"
                    variant="ghost"
                    color="whiteAlpha.700"
                    _hover={{ bg: "whiteAlpha.100" }}
                    onClick={handleCopyMessage}
                    isDisabled={!message}
                  />
                </Tooltip>

                <Tooltip label="Copy shareable link" placement="top">
                  <IconButton
                    aria-label="Copy link"
                    icon={<LinkIcon />}
                    size="sm"
                    variant="ghost"
                    color="whiteAlpha.700"
                    _hover={{ bg: "whiteAlpha.100" }}
                    onClick={handleCopyLink}
                    isDisabled={!message}
                  />
                </Tooltip>

                <Tooltip label="Clear message" placement="top">
                  <IconButton
                    aria-label="Clear message"
                    icon={<DeleteIcon />}
                    size="sm"
                    variant="ghost"
                    color="whiteAlpha.700"
                    _hover={{ bg: "whiteAlpha.100", color: "red.400" }}
                    onClick={handleClear}
                    isDisabled={!message}
                  />
                </Tooltip>
              </HStack>
            </HStack>

            {/* Message Input */}
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`example.com wants you to sign in with your Ethereum account:
0x742d35Cc6C4C1Ca5d428d9eE0e9B1E1234567890

Sign in with Ethereum to the app.

URI: https://example.com/login
Version: 1
Chain ID: 1
Nonce: abcdef123456
Issued At: 2024-01-15T12:00:00.000Z`}
              minH="400px"
              bg="blackAlpha.600"
              border="1px solid"
              borderColor="whiteAlpha.300"
              borderRadius="lg"
              color="white"
              fontFamily="mono"
              fontSize="sm"
              p={4}
              resize="vertical"
              _placeholder={{ color: "whiteAlpha.400" }}
              _hover={{ borderColor: "whiteAlpha.400" }}
              _focus={{
                borderColor: "blue.400",
                boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
              }}
            />

            {/* Options Row */}
            <FormControl display="flex" alignItems="center" w="auto">
              <FormLabel htmlFor="realtime-validation" mb="0" color="whiteAlpha.800" fontSize="sm">
                Real-time validation
              </FormLabel>
              <Switch
                id="realtime-validation"
                colorScheme="blue"
                isChecked={isRealTimeValidation}
                onChange={(e) => setIsRealTimeValidation(e.target.checked)}
              />
            </FormControl>

            {/* Action Buttons */}
            <HStack spacing={3}>
              <Button
                colorScheme="blue"
                size="md"
                flex="1"
                onClick={() => handleValidate(true)}
                isLoading={isLoading}
                loadingText="Validating..."
              >
                Validate
              </Button>

              {/* Sign Flow - grouped visually */}
              <HStack
                spacing={0}
                bg="blue.900"
                borderRadius="md"
                border="1px solid"
                borderColor="blue.500"
                overflow="hidden"
              >
                {isConnected && (
                  <Tooltip
                    label="Update domain, address, and URI to match your wallet and current site"
                    placement="top"
                    hasArrow
                  >
                    <Button
                      size="md"
                      variant="ghost"
                      color="blue.200"
                      _hover={{ bg: "blue.800" }}
                      onClick={handleAutoFill}
                      borderRadius="0"
                      px={4}
                    >
                      Auto-fill
                    </Button>
                  </Tooltip>
                )}
                <Tooltip
                  label={isConnected ? "Sign this message with your wallet" : "Connect wallet to sign"}
                  placement="top"
                  hasArrow
                >
                  <Button
                    colorScheme="blue"
                    size="md"
                    w="110px"
                    onClick={handleSign}
                    isLoading={isSigningPending}
                    loadingText="Signing"
                    leftIcon={!isSigningPending ? <EditIcon /> : undefined}
                    borderRadius={isConnected ? "0" : "md"}
                    borderLeft={isConnected ? "1px solid" : "none"}
                    borderLeftColor="blue.600"
                  >
                    {isConnected ? "Sign" : "Connect"}
                  </Button>
                </Tooltip>
              </HStack>
            </HStack>

            {/* Signature Section */}
            <Collapse in={!!signature} animateOpacity>
              <Box
                p={4}
                bg="blue.900"
                border="1px solid"
                borderColor="blue.500"
                borderRadius="lg"
              >
                <HStack justify="space-between" mb={2}>
                  <Text fontWeight="semibold" fontSize="sm" color="white">
                    Signature
                  </Text>
                  <HStack spacing={2}>
                    <Tooltip label="Copy signature">
                      <IconButton
                        aria-label="Copy signature"
                        icon={<CopyIcon />}
                        size="xs"
                        variant="ghost"
                        color="whiteAlpha.700"
                        _hover={{ bg: "whiteAlpha.200" }}
                        onClick={handleCopySignature}
                      />
                    </Tooltip>
                    <Button
                      size="xs"
                      colorScheme={verificationResult === true ? "green" : verificationResult === false ? "red" : "blue"}
                      variant="outline"
                      onClick={handleVerify}
                      isLoading={isVerifying}
                      leftIcon={verificationResult === true ? <CheckIcon /> : undefined}
                    >
                      {verificationResult === true ? "Valid" : verificationResult === false ? "Invalid" : "Verify"}
                    </Button>
                  </HStack>
                </HStack>
                <Text
                  fontSize="xs"
                  fontFamily="mono"
                  color="whiteAlpha.800"
                  wordBreak="break-all"
                  bg="blackAlpha.400"
                  p={2}
                  borderRadius="md"
                >
                  {signature}
                </Text>
              </Box>
            </Collapse>
          </VStack>
        </GridItem>

        {/* Results Panel */}
        <GridItem>
          <VStack spacing={4} align="stretch">
            {/* Header Row - matches Input panel height */}
            <HStack justify="space-between" minH="32px">
              <Heading size="md" color="whiteAlpha.900">
                Validation Results
              </Heading>
              {result && (
                <Tooltip label="Export validation report" placement="top">
                  <IconButton
                    aria-label="Export report"
                    icon={<DownloadIcon />}
                    size="sm"
                    variant="ghost"
                    color="whiteAlpha.700"
                    _hover={{ bg: "whiteAlpha.100" }}
                    onClick={() => {
                      const report = ValidationEngine.exportReport(result);
                      const blob = new Blob(
                        [JSON.stringify(report, null, 2)],
                        { type: "application/json" }
                      );
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "siwe-validation-report.json";
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  />
                </Tooltip>
              )}
            </HStack>

            {/* Spacer to align with Input panel's controls row */}
            <Box minH="32px" />

            <Box
              minH="400px"
              bg="blackAlpha.400"
              borderRadius="lg"
              border="1px solid"
              borderColor="whiteAlpha.200"
              p={4}
              overflowY="auto"
              maxH="calc(100vh - 300px)"
            >
              <ValidationResults
                result={result}
                isLoading={isLoading}
                onFixIssue={handleFixIssue}
              />
            </Box>
          </VStack>
        </GridItem>
      </Grid>
    </Box>
  );
};

export default SiweValidator;

