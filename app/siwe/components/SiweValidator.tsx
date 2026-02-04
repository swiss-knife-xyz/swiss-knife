"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Tooltip,
  IconButton,
  Badge,
  Divider,
} from "@chakra-ui/react";
import {
  ChevronDownIcon,
  CopyIcon,
  DeleteIcon,
  RepeatIcon,
  DownloadIcon,
} from "@chakra-ui/icons";
import {
  ValidationEngine,
  FieldReplacer,
  AutoFixer,
  type ValidationResult,
  type ValidationError,
  type ValidationProfile,
} from "@/lib/siwe";
import { ValidationResults } from "./ValidationResults";

interface SiweValidatorProps {
  initialMessage?: string;
}

export const SiweValidator = ({ initialMessage = "" }: SiweValidatorProps) => {
  const [message, setMessage] = useState(initialMessage);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRealTimeValidation, setIsRealTimeValidation] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<string>("strict");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const toast = useToast();

  // Get available profiles
  const profiles = ValidationEngine.PROFILES;

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
          const validationResult = ValidationEngine.validate(message, {
            profile: profiles[selectedProfile],
          });

          setResult(validationResult);

          if (showToast) {
            if (validationResult.isValid) {
              toast({
                title: "Valid SIWE Message",
                description: "The message complies with EIP-4361",
                status: "success",
                duration: 3000,
                isClosable: true,
              });
            } else {
              toast({
                title: "Validation Issues Found",
                description: `${validationResult.errors.length} error(s), ${validationResult.warnings.length} warning(s)`,
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
    [message, selectedProfile, profiles, toast]
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

        // Re-validate after fix
        setTimeout(() => handleValidate(false), 100);
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
    [message, toast, handleValidate]
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

    // Use the full auto-fixer
    const { SiweMessageParser } = require("@/lib/siwe");
    const parsed = SiweMessageParser.parse(message);
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

      // Re-validate
      setTimeout(() => handleValidate(false), 100);
    }
  }, [message, result, toast, handleValidate]);

  const handleClear = useCallback(() => {
    setMessage("");
    setResult(null);
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

  const handleLoadSample = useCallback(
    (sampleKey: string) => {
      const samples = ValidationEngine.generateSamples();
      const sample = samples[sampleKey];
      if (sample) {
        setMessage(sample);
        setResult(null);
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

  const handleGenerateTemplate = useCallback(() => {
    const template = AutoFixer.generateTemplate();
    setMessage(template);
    setResult(null);
    toast({
      title: "Template generated",
      description: "A new SIWE message template has been created",
      status: "info",
      duration: 2000,
      isClosable: true,
    });
  }, [toast]);

  // Quick status indicator
  const getQuickStatus = () => {
    if (!message.trim()) return null;
    const quick = ValidationEngine.quickValidate(message);
    return quick;
  };

  const quickStatus = getQuickStatus();

  return (
    <Box w="full" maxW="1400px" mx="auto">
      <Grid
        templateColumns={{ base: "1fr", lg: "1fr 1fr" }}
        gap={8}
        alignItems="start"
      >
        {/* Input Panel */}
        <GridItem>
          <VStack spacing={4} align="stretch">
            <HStack justify="space-between">
              <Heading size="md" color="whiteAlpha.900">
                SIWE Message Input
              </Heading>
              {quickStatus && (
                <HStack spacing={2}>
                  {quickStatus.isComplete && (
                    <Badge colorScheme="blue" variant="subtle">
                      Complete
                    </Badge>
                  )}
                  {quickStatus.errorCount > 0 && (
                    <Badge colorScheme="red" variant="subtle">
                      {quickStatus.errorCount} errors
                    </Badge>
                  )}
                  {quickStatus.warningCount > 0 && (
                    <Badge colorScheme="yellow" variant="subtle">
                      {quickStatus.warningCount} warnings
                    </Badge>
                  )}
                </HStack>
              )}
            </HStack>

            {/* Controls Row */}
            <HStack justify="space-between" flexWrap="wrap" gap={2}>
              <HStack spacing={2}>
                <Menu>
                  <MenuButton
                    as={Button}
                    size="sm"
                    variant="outline"
                    rightIcon={<ChevronDownIcon />}
                    color="white"
                    borderColor="whiteAlpha.400"
                    _hover={{ bg: "whiteAlpha.100" }}
                  >
                    Load Sample
                  </MenuButton>
                  <MenuList bg="gray.800" borderColor="whiteAlpha.300">
                    <MenuItem
                      onClick={() => handleLoadSample("minimal")}
                      bg="transparent"
                      _hover={{ bg: "whiteAlpha.200" }}
                    >
                      Minimal (no statement)
                    </MenuItem>
                    <MenuItem
                      onClick={() => handleLoadSample("withResources")}
                      bg="transparent"
                      _hover={{ bg: "whiteAlpha.200" }}
                    >
                      With Resources
                    </MenuItem>
                  </MenuList>
                </Menu>

                <Tooltip label="Generate new template" placement="top">
                  <IconButton
                    aria-label="Generate template"
                    icon={<RepeatIcon />}
                    size="sm"
                    variant="outline"
                    color="white"
                    borderColor="whiteAlpha.400"
                    _hover={{ bg: "whiteAlpha.100" }}
                    onClick={handleGenerateTemplate}
                  />
                </Tooltip>
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
            <HStack justify="space-between" flexWrap="wrap" gap={4}>
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

              <Menu>
                <MenuButton
                  as={Button}
                  size="sm"
                  variant="outline"
                  rightIcon={<ChevronDownIcon />}
                  color="white"
                  borderColor="whiteAlpha.400"
                  _hover={{ bg: "whiteAlpha.100" }}
                >
                  Profile: {profiles[selectedProfile]?.name.split(" ")[0]}
                </MenuButton>
                <MenuList bg="gray.800" borderColor="whiteAlpha.300">
                  {Object.entries(profiles).map(([key, profile]) => (
                    <MenuItem
                      key={key}
                      onClick={() => setSelectedProfile(key)}
                      bg="transparent"
                      _hover={{ bg: "whiteAlpha.200" }}
                    >
                      <VStack align="start" spacing={0}>
                        <Text fontWeight="medium">{profile.name}</Text>
                        <Text fontSize="xs" color="whiteAlpha.600">
                          {profile.description}
                        </Text>
                      </VStack>
                    </MenuItem>
                  ))}
                </MenuList>
              </Menu>
            </HStack>

            {/* Action Buttons */}
            <HStack spacing={4}>
              <Button
                colorScheme="blue"
                size="lg"
                flex="1"
                onClick={() => handleValidate(true)}
                isLoading={isLoading}
                loadingText="Validating..."
              >
                Validate Message
              </Button>

              {result &&
                [...result.errors, ...result.warnings, ...result.suggestions].some(
                  (i) => i.fixable
                ) && (
                  <Tooltip label="Apply all available fixes" placement="top">
                    <Button
                      colorScheme="green"
                      size="lg"
                      variant="outline"
                      onClick={handleFixAll}
                      leftIcon={<RepeatIcon />}
                    >
                      Fix All
                    </Button>
                  </Tooltip>
                )}
            </HStack>
          </VStack>
        </GridItem>

        {/* Results Panel */}
        <GridItem>
          <VStack spacing={4} align="stretch">
            <HStack justify="space-between">
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

            <Divider borderColor="whiteAlpha.200" />

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

