"use client";

import { useState, useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import {
  Box,
  VStack,
  HStack,
  Button,
  Text,
  Heading,
  useToast,
  Spinner,
} from "@chakra-ui/react";
import {
  CompiledContract,
  CompileOutput,
  CompileResult,
  WorkerMessage,
} from "./types";

export default function SolidityIDE() {
  const [code, setCode] = useState<string>(
    "// SPDX-License-Identifier: MIT\npragma solidity 0.8.30;\n\ncontract Counter {\n    uint256 public number;\n    \n    function increment() public {\n        ++number;\n    }\n}"
  );
  const [compileResult, setCompileResult] = useState<CompileResult | null>(
    null
  );
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [workerReady, setWorkerReady] = useState<boolean>(false);
  const workerRef = useRef<Worker | null>(null);
  const toast = useToast();

  useEffect(() => {
    const initWorker = (): void => {
      try {
        const worker = new Worker("/worker/solc.worker.js");
        workerRef.current = worker;

        worker.postMessage({ type: "init" });

        setTimeout(() => {
          setWorkerReady(true);
        }, 1000);
      } catch (error) {
        console.error("Failed to initialize worker:", error);
      }
    };

    initWorker();

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [toast]);

  const compileCode = async (): Promise<void> => {
    if (!workerRef.current) {
      toast({
        title: "Compiler Not Ready",
        description: "Please wait a moment and try again",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsCompiling(true);
    setCompileResult(null);

    try {
      const worker = workerRef.current;

      const compilePromise = new Promise<CompileOutput>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Compilation timeout"));
        }, 30000);

        worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
          clearTimeout(timeout);
          if (e.data.success && e.data.output) {
            resolve(e.data.output);
          } else {
            reject(new Error(e.data.error || "Unknown error"));
          }
        };

        worker.onerror = (error: ErrorEvent) => {
          clearTimeout(timeout);
          reject(error);
        };
      });

      worker.postMessage({ code });

      const output = await compilePromise;

      if (output.errors) {
        const errors = output.errors.filter(
          (error) => error.severity === "error"
        );
        const warnings = output.errors.filter(
          (error) => error.severity === "warning"
        );

        if (errors.length > 0) {
          setCompileResult({
            error: errors.map((e) => e.formattedMessage).join("\n\n"),
          });
          toast({
            title: "Compilation Failed",
            description: "Check the errors in the sidebar",
            status: "error",
            duration: 3000,
            isClosable: true,
          });
          return;
        }

        if (warnings.length > 0) {
          const contracts: { [contractName: string]: CompiledContract } = {};
          Object.keys(output.contracts?.["contract.sol"] || {}).forEach(
            (contractName) => {
              const contract = output.contracts!["contract.sol"][contractName];
              contracts[contractName] = {
                abi: contract.abi,
                bytecode: contract.evm.bytecode.object,
                deployedBytecode: contract.evm.deployedBytecode.object,
              };
            }
          );

          setCompileResult({
            contracts,
            warnings,
          });
          return;
        }
      }

      const contracts: { [contractName: string]: CompiledContract } = {};
      Object.keys(output.contracts?.["contract.sol"] || {}).forEach(
        (contractName) => {
          const contract = output.contracts!["contract.sol"][contractName];
          contracts[contractName] = {
            abi: contract.abi,
            bytecode: contract.evm.bytecode.object,
            deployedBytecode: contract.evm.deployedBytecode.object,
          };
        }
      );

      setCompileResult({
        contracts,
      });

      toast({
        title: "Compilation Successful",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown compilation error";
      setCompileResult({
        error: errorMessage,
      });
      toast({
        title: "Compilation Error",
        description: errorMessage,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsCompiling(false);
    }
  };

  const copyToClipboard = (text: string, label: string): void => {
    navigator.clipboard.writeText(text);
    toast({
      title: `${label} Copied!`,
      status: "success",
      duration: 2000,
      isClosable: true,
    });
  };

  return (
    <HStack spacing={0} alignItems="stretch" h="calc(100vh - 67px)">
      <Box
        w="320px"
        bg="gray.900"
        color="white"
        p={6}
        overflowY="auto"
        borderRight="1px solid"
        borderColor="whiteAlpha.200"
        flexShrink={0}
      >
        <VStack spacing={6} align="stretch">
          <Heading
            size="md"
            color="white"
            display="flex"
            alignItems="center"
            gap={2}
          >
            Solidity Compiler{" "}
            <Box
              as="span"
              bg="blue.700"
              color="white"
              px={2}
              py={0.5}
              borderRadius="md"
              fontSize="xs"
              fontWeight="semibold"
            >
              v0.8.30
            </Box>
          </Heading>

          <Button
            onClick={compileCode}
            isLoading={isCompiling}
            loadingText="Compiling"
            colorScheme="blue"
            size="md"
            w="full"
            isDisabled={!workerReady}
          >
            {workerReady ? (
              "Compile"
            ) : (
              <HStack spacing={2}>
                <Spinner size="sm" />
                <Text>Loading Compiler...</Text>
              </HStack>
            )}
          </Button>

          {compileResult && (
            <VStack spacing={4} align="stretch" mt={4}>
              {compileResult.error ? (
                <Box
                  bg="red.900"
                  p={4}
                  borderRadius="md"
                  border="1px solid"
                  borderColor="red.700"
                >
                  <Text fontSize="sm" fontWeight="bold" mb={2} color="red.200">
                    Compilation Error:
                  </Text>
                  <Box
                    as="pre"
                    fontSize="xs"
                    whiteSpace="pre-wrap"
                    color="red.100"
                    maxH="300px"
                    overflowY="auto"
                  >
                    {compileResult.error}
                  </Box>
                </Box>
              ) : (
                <VStack spacing={4} align="stretch">
                  <Box
                    bg="green.900"
                    p={3}
                    borderRadius="md"
                    border="1px solid"
                    borderColor="green.700"
                  >
                    <Text fontSize="sm" fontWeight="bold" color="green.200">
                      ✓ Compiled Successfully
                    </Text>
                  </Box>

                  {Object.keys(compileResult.contracts || {}).map(
                    (contractName) => (
                      <Box
                        key={contractName}
                        bg="gray.800"
                        p={4}
                        borderRadius="md"
                        border="1px solid"
                        borderColor="gray.700"
                      >
                        <Text
                          fontSize="sm"
                          fontWeight="bold"
                          mb={3}
                          color="gray.200"
                        >
                          {contractName}
                        </Text>

                        <VStack spacing={2}>
                          <Button
                            onClick={() =>
                              copyToClipboard(
                                JSON.stringify(
                                  compileResult.contracts![contractName].abi,
                                  null,
                                  2
                                ),
                                "ABI"
                              )
                            }
                            size="sm"
                            w="full"
                            bg="gray.700"
                            _hover={{ bg: "gray.600" }}
                            color="white"
                          >
                            Copy ABI
                          </Button>

                          <Button
                            onClick={() =>
                              copyToClipboard(
                                compileResult.contracts![contractName].bytecode,
                                "Bytecode"
                              )
                            }
                            size="sm"
                            w="full"
                            bg="gray.700"
                            _hover={{ bg: "gray.600" }}
                            color="white"
                          >
                            Copy Bytecode
                          </Button>

                          {compileResult.contracts![contractName]
                            .deployedBytecode && (
                            <Button
                              onClick={() =>
                                copyToClipboard(
                                  compileResult.contracts![contractName]
                                    .deployedBytecode,
                                  "Deployed Bytecode"
                                )
                              }
                              size="sm"
                              w="full"
                              bg="gray.700"
                              _hover={{ bg: "gray.600" }}
                              color="white"
                            >
                              Copy Deployed Bytecode
                            </Button>
                          )}
                        </VStack>
                      </Box>
                    )
                  )}

                  {compileResult.warnings &&
                    compileResult.warnings.length > 0 && (
                      <Box
                        bg="yellow.900"
                        p={3}
                        borderRadius="md"
                        border="1px solid"
                        borderColor="yellow.700"
                      >
                        <Text
                          fontSize="sm"
                          fontWeight="bold"
                          mb={2}
                          color="yellow.200"
                        >
                          Warnings:
                        </Text>
                        <VStack spacing={2} align="stretch">
                          {compileResult.warnings.map((warning, idx) => (
                            <Text key={idx} fontSize="xs" color="yellow.100">
                              {warning.formattedMessage}
                            </Text>
                          ))}
                        </VStack>
                      </Box>
                    )}
                </VStack>
              )}
            </VStack>
          )}
        </VStack>
      </Box>

      <Box flex={1} h="full" bg="gray.950">
        <Editor
          height="100%"
          defaultLanguage="sol"
          theme="vs-dark"
          value={code}
          onChange={(value) => setCode(value || "")}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </Box>
    </HStack>
  );
}
