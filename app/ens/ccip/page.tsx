"use client";

import { useState, useRef, useEffect } from "react";
import {
  Box,
  Container,
  Heading,
  Input,
  Button,
  VStack,
  Text,
  Code,
  useToast,
  Center,
  Flex,
  Skeleton,
  Link,
} from "@chakra-ui/react";
import {
  createPublicClient,
  http,
  encodeFunctionData,
  zeroAddress,
  parseAbi,
  toHex,
  toFunctionSelector,
  decodeAbiParameters,
} from "viem";
import { mainnet } from "viem/chains";
import { normalize, namehash, packetToBytes } from "viem/ens";
import { keyframes } from "@emotion/react";

// Create a public client instance with CCIP Read enabled (default)
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
  ccipRead: false, // without it even the readContract automatically resolves the ccip read
});

// Universal Resolver ABI for resolve function (correct implementation)
const UNIVERSAL_RESOLVER_ABI = [
  {
    inputs: [
      { internalType: "address", name: "sender", type: "address" },
      { internalType: "string[]", name: "urls", type: "string[]" },
      { internalType: "bytes", name: "callData", type: "bytes" },
      { internalType: "bytes4", name: "callbackFunction", type: "bytes4" },
      { internalType: "bytes", name: "extraData", type: "bytes" },
    ],
    name: "OffchainLookup",
    type: "error",
  },
  {
    inputs: [
      { internalType: "bytes", name: "name", type: "bytes" },
      { internalType: "bytes", name: "data", type: "bytes" },
    ],
    name: "resolve",
    outputs: [
      { internalType: "bytes", name: "", type: "bytes" },
      { internalType: "address", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "bytes", name: "response", type: "bytes" },
      { internalType: "bytes", name: "extraData", type: "bytes" },
    ],
    name: "resolveSingleCallback",
    outputs: [
      { internalType: "bytes", name: "", type: "bytes" },
      { internalType: "address", name: "", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Animation keyframes
const blinkAnimation = keyframes`
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
`;

export default function CCIPRead() {
  const [ensName, setEnsName] = useState("");
  const [currentEnsName, setCurrentEnsName] = useState("");
  const [loading, setLoading] = useState(false);
  const visualizationRef = useRef<HTMLDivElement>(null);
  const hasAnimatedTotalRef = useRef<boolean>(false);
  const [result, setResult] = useState<{
    resolvedAddress?: string;
    timing?: {
      lookup?: number;
      gateway?: number;
      return?: number;
      verify?: number;
      total?: number;
    };
    progress?: {
      lookup?: {
        active: boolean;
        completed: boolean;
      };
      revert?: {
        active: boolean;
        completed: boolean;
      };
      gateway?: {
        active: boolean;
        completed: boolean;
      };
      return?: {
        active: boolean;
        completed: boolean;
      };
      verify?: {
        active: boolean;
        completed: boolean;
      };
      final?: {
        active: boolean;
        completed: boolean;
      };
    };
  } | null>(null);
  const toast = useToast();
  const timerRef = useRef<{
    start?: number;
    lookup?: number;
    revert?: number;
    gateway?: number;
    return?: number;
    verify?: number;
    final?: number;
    end?: number;
  }>({});

  // Custom implementation using the low-level call with CCIP Read
  const handleResolve = async () => {
    if (!ensName) {
      toast({
        title: "Error",
        description: "Please enter an ENS name",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setLoading(true);
      setCurrentEnsName(ensName);
      // Reset timers and progress
      timerRef.current = {};
      timerRef.current.start = performance.now();
      hasAnimatedTotalRef.current = false;

      // Initialize the result state without animations
      setResult({
        progress: {
          lookup: {
            active: true,
            completed: false,
          },
          revert: {
            active: false,
            completed: false,
          },
          gateway: {
            active: false,
            completed: false,
          },
          return: {
            active: false,
            completed: false,
          },
          verify: {
            active: false,
            completed: false,
          },
          final: {
            active: false,
            completed: false,
          },
        },
        timing: {},
      });

      // Scroll to visualization
      if (visualizationRef.current) {
        const yOffset = -50; // Add some padding from the top
        const element = visualizationRef.current;
        const y =
          element.getBoundingClientRect().top + window.pageYOffset + yOffset;

        window.scrollTo({
          top: y,
          behavior: "smooth",
        });
      }

      // Normalize the ENS name
      const normalizedName = normalize(ensName);

      // Get the namehash
      const nameHash = namehash(normalizedName);

      let resolvedAddress: string | undefined;

      try {
        // Step 1: Call the resolve function. For CCIP this will throw the `OffchainLookup` error
        await publicClient.readContract({
          address: mainnet.contracts.ensUniversalResolver.address,
          abi: UNIVERSAL_RESOLVER_ABI,
          functionName: "resolve",
          args: [
            toHex(packetToBytes(normalizedName)),
            encodeFunctionData({
              abi: parseAbi(["function addr(bytes32 node)"]),
              functionName: "addr",
              args: [nameHash],
            }),
          ],
        });
      } catch (error: any) {
        if (error.message.includes("OffchainLookup")) {
          // Record lookup completion time immediately
          timerRef.current.lookup = performance.now();
          const lookupTime = Math.round(
            timerRef.current.lookup - timerRef.current.start
          );

          // Update UI state for lookup completion
          setResult((prev) => ({
            ...prev,
            progress: {
              ...prev?.progress,
              lookup: {
                active: false,
                completed: true,
              },
              revert: {
                active: true,
                completed: false,
              },
            },
            timing: {
              ...prev?.timing,
              lookup: lookupTime,
            },
          }));

          // Step 2: Get the return data from the error
          const errorDataArgs = error.cause.data.args;
          const sender = errorDataArgs[0];
          const urls = errorDataArgs[1];
          const callData = errorDataArgs[2];
          const callbackFunctionSelector = errorDataArgs[3];
          const extraData = errorDataArgs[4];

          // Record revert completion time
          timerRef.current.revert = performance.now();
          const revertTime = Math.round(
            timerRef.current.revert - timerRef.current.lookup
          );

          // Update UI state for revert completion
          setResult((prev) => ({
            ...prev,
            progress: {
              ...prev?.progress,
              revert: {
                active: false,
                completed: true,
              },
              gateway: {
                active: true,
                completed: false,
              },
            },
            lookupDetails: {
              nameHash,
              gatewayUrl: urls[0],
            },
          }));

          // Step 3: Make a request to the gateway url with the sender and callData received from the error
          const response = await fetch(urls[0], {
            method: "POST",
            body: JSON.stringify({ sender, data: callData }),
          });
          const data = await response.json();
          const responseData = data.data;

          // Record gateway completion time
          timerRef.current.gateway = performance.now();
          const gatewayTime = Math.round(
            timerRef.current.gateway - timerRef.current.revert
          );

          // Update UI state for gateway completion
          setResult((prev) => ({
            ...prev,
            progress: {
              ...prev?.progress,
              gateway: {
                active: false,
                completed: true,
              },
              return: {
                active: true,
                completed: false,
              },
            },
            timing: {
              ...prev?.timing,
              gateway: gatewayTime,
            },
          }));

          // Record return data reception time
          timerRef.current.return = performance.now();
          const returnTime = Math.round(
            timerRef.current.return - timerRef.current.gateway
          );

          // Update UI state for return completion
          setResult((prev) => ({
            ...prev,
            progress: {
              ...prev?.progress,
              return: {
                active: false,
                completed: true,
              },
              verify: {
                active: true,
                completed: false,
              },
            },
            timing: {
              ...prev?.timing,
              return: returnTime,
            },
          }));

          // find the function to call corresponding to the `callbackFunctionSelector` in the UNIVERSAL_RESOLVER_ABI (it'll be `resolveSingleCallback()`)
          const functionToCall = UNIVERSAL_RESOLVER_ABI.filter(
            (
              item
            ): item is (typeof UNIVERSAL_RESOLVER_ABI)[number] & {
              type: "function";
            } => item.type === "function"
          ).find((fn) => toFunctionSelector(fn) === callbackFunctionSelector);

          if (!functionToCall) {
            throw new Error("Callback function not found in ABI");
          }

          // Step 4: Call the callback function with the gateway response data and extra data from the error
          const [result, resolverAddress] = await publicClient.readContract({
            address: mainnet.contracts.ensUniversalResolver.address,
            abi: UNIVERSAL_RESOLVER_ABI,
            functionName: functionToCall.name,
            args: [responseData, extraData],
          });

          // Record verification completion time
          timerRef.current.verify = performance.now();
          const verifyTime = Math.round(
            timerRef.current.verify - timerRef.current.return
          );

          // Update UI state for verify completion
          setResult((prev) => ({
            ...prev,
            progress: {
              ...prev?.progress,
              verify: {
                active: false,
                completed: true,
              },
              final: {
                active: true,
                completed: false,
              },
            },
            timing: {
              ...prev?.timing,
              verify: verifyTime,
            },
          }));

          // result is a bytes encoded resolved address, convert it to address
          [resolvedAddress] = decodeAbiParameters(
            [
              {
                type: "address",
              },
            ],
            result
          );

          // Record final completion time
          timerRef.current.final = performance.now();
          timerRef.current.end = performance.now();
          const totalTime = Math.round(
            timerRef.current.end - timerRef.current.start
          );

          // Update final result with all timing information
          setResult((prev) => ({
            ...prev,
            resolvedAddress,
            progress: {
              lookup: {
                active: false,
                completed: true,
              },
              revert: {
                active: false,
                completed: true,
              },
              gateway: {
                active: false,
                completed: true,
              },
              return: {
                active: false,
                completed: true,
              },
              verify: {
                active: false,
                completed: true,
              },
              final: {
                active: false,
                completed: true,
              },
            },
            timing: {
              lookup: Math.round(
                timerRef.current.lookup! - timerRef.current.start!
              ),
              gateway: Math.round(
                timerRef.current.gateway! - timerRef.current.revert!
              ),
              return: Math.round(
                timerRef.current.return! - timerRef.current.gateway!
              ),
              verify: Math.round(
                timerRef.current.verify! - timerRef.current.return!
              ),
              total: totalTime,
            },
          }));

          return;
        }
      }

      if (!resolvedAddress || resolvedAddress === zeroAddress) {
        throw new Error(
          "Name could not be resolved (resolved to zero address)"
        );
      }
    } catch (error: any) {
      console.error("[Custom] Error:", error);
      toast({
        title: "Resolution Error",
        description: error.message || "Failed to resolve name",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleResolve();
    }
  };

  const handlePaste = () => {
    // Use setTimeout to ensure the pasted content is available
    setTimeout(() => {
      handleResolve();
    }, 100);
  };

  // Component for the animation sequence
  const ProcessDiagram = () => {
    useEffect(() => {
      if (!hasAnimatedTotalRef.current) {
        hasAnimatedTotalRef.current = true;
      }
    }, []);

    return (
      <Box
        mt={6}
        p={6}
        borderRadius="md"
        border="1px solid"
        borderColor="whiteAlpha.300"
        position="relative"
        h="600px"
        w="100%"
        minW="800px"
        bg="#111"
        overflow="hidden"
      >
        <Text fontWeight="bold" color="#63B3ED" fontSize="xl">
          CCIP Resolve Flow
        </Text>

        {/* Total time indicator */}
        {result?.timing?.total && !isNaN(result.timing.total) && (
          <Box
            position="absolute"
            top="10px"
            right="10px"
            bg="#1A202C"
            px={4}
            py={2}
            borderRadius="md"
            border="1px solid"
            borderColor="whiteAlpha.200"
            opacity={hasAnimatedTotalRef.current ? 1 : 0}
            animation={
              hasAnimatedTotalRef.current
                ? undefined
                : "fadeIn 0.5s ease-in forwards"
            }
            sx={{
              "@keyframes fadeIn": {
                "0%": {
                  opacity: 0,
                  transform: "translateY(-10px)",
                },
                "100%": {
                  opacity: 1,
                  transform: "translateY(0)",
                },
              },
            }}
          >
            <Text fontSize="md" fontWeight="bold">
              Total: {(result?.timing?.total / 1000).toFixed(4)}s
            </Text>
          </Box>
        )}

        {/* Column headers */}
        <Text
          position="absolute"
          left="20%"
          top="100px"
          transform="translateX(-50%)"
          fontWeight="bold"
          fontSize="xl"
        >
          Client
        </Text>
        <Text
          position="absolute"
          left="50%"
          top="100px"
          transform="translateX(-50%)"
          fontWeight="bold"
          fontSize="xl"
        >
          Resolver
        </Text>
        <Text
          position="absolute"
          left="80%"
          top="100px"
          transform="translateX(-50%)"
          fontWeight="bold"
          fontSize="xl"
        >
          Gateway
        </Text>

        {/* Vertical lines - render these first */}
        <Box
          position="absolute"
          left="20%"
          top="130px"
          bottom="20px"
          width="2px"
          bg="gray.500"
          zIndex={1}
        />
        <Box
          position="absolute"
          left="50%"
          top="130px"
          bottom="20px"
          width="2px"
          bg="gray.500"
          zIndex={1}
        />
        <Box
          position="absolute"
          left="80%"
          top="130px"
          bottom="20px"
          width="2px"
          bg="gray.500"
          zIndex={1}
        />

        {/* Lookup ENS name line */}
        <Box
          position="absolute"
          left="20%"
          top="170px"
          width="calc(30% - 4px)"
          height="2px"
          bg="#63B3ED"
          opacity={
            result
              ? result.progress?.lookup?.active
                ? 0.4
                : result.progress?.lookup?.completed
                ? 1
                : 0
              : 1
          }
          animation={
            result?.progress?.lookup?.active
              ? `${blinkAnimation} 1s infinite`
              : "none"
          }
          display="flex"
          justifyContent="flex-end"
          alignItems="center"
          zIndex={2}
          _after={{
            content: '""',
            position: "absolute",
            right: "-8px",
            borderLeft: "12px solid #63B3ED",
            borderTop: "6px solid transparent",
            borderBottom: "6px solid transparent",
            opacity: result
              ? result.progress?.lookup?.active
                ? 0.4
                : result.progress?.lookup?.completed
                ? 1
                : 0
              : 1,
          }}
        />
        <Text
          position="absolute"
          left="35%"
          top="150px"
          transform="translateX(-50%)"
          fontSize="md"
          color="#63B3ED"
          opacity={
            result
              ? result.progress?.lookup?.active ||
                result.progress?.lookup?.completed
                ? 1
                : 0
              : 1
          }
          zIndex={2}
          bg="rgba(0, 0, 0, 0.6)"
          px={2}
          borderRadius="sm"
        >
          Lookup {currentEnsName.length > 0 ? currentEnsName : "CCIP ENS"}
        </Text>
        {result?.timing?.lookup && result?.progress?.lookup?.completed && (
          <Text
            position="absolute"
            left="35%"
            top="190px"
            transform="translateX(-50%)"
            fontSize="sm"
            color="gray.400"
            zIndex={2}
            bg="#111"
            px={2}
          >
            {result?.timing?.lookup}ms
          </Text>
        )}

        {/* Revert OffchainLookup line */}
        <Box
          position="absolute"
          right="50%"
          top="250px"
          width="calc(30% - 4px)"
          height="2px"
          bg="#F687B3"
          opacity={
            result
              ? result.progress?.revert?.active
                ? 0.4
                : result.progress?.revert?.completed
                ? 1
                : 0
              : 1
          }
          animation={
            result?.progress?.revert?.active
              ? `${blinkAnimation} 1s infinite`
              : "none"
          }
          display="flex"
          justifyContent="flex-start"
          alignItems="center"
          zIndex={2}
          _after={{
            content: '""',
            position: "absolute",
            left: "-8px",
            borderRight: "12px solid #F687B3",
            borderTop: "6px solid transparent",
            borderBottom: "6px solid transparent",
            opacity: result
              ? result.progress?.revert?.active
                ? 0.4
                : result.progress?.revert?.completed
                ? 1
                : 0
              : 1,
          }}
        />
        <Text
          position="absolute"
          left="35%"
          top="230px"
          transform="translateX(-50%)"
          fontSize="md"
          color="#F687B3"
          opacity={
            result
              ? result.progress?.revert?.active ||
                result.progress?.revert?.completed
                ? 1
                : 0
              : 1
          }
          zIndex={2}
          bg="rgba(0, 0, 0, 0.6)"
          px={2}
          borderRadius="sm"
        >
          revert OffchainLookup()
        </Text>

        {/* Ask Gateway line */}
        <Box
          position="absolute"
          left="20%"
          top="330px"
          width="calc(60% - 4px)"
          height="2px"
          bg="#9F7AEA"
          opacity={
            result
              ? result.progress?.gateway?.active
                ? 0.4
                : result.progress?.gateway?.completed
                ? 1
                : 0
              : 1
          }
          animation={
            result?.progress?.gateway?.active
              ? `${blinkAnimation} 1s infinite`
              : "none"
          }
          display="flex"
          justifyContent="flex-end"
          alignItems="center"
          zIndex={2}
          _after={{
            content: '""',
            position: "absolute",
            right: "-8px",
            borderLeft: "12px solid #9F7AEA",
            borderTop: "6px solid transparent",
            borderBottom: "6px solid transparent",
            opacity: result
              ? result.progress?.gateway?.active
                ? 0.4
                : result.progress?.gateway?.completed
                ? 1
                : 0
              : 1,
          }}
        />
        <Text
          position="absolute"
          left="50%"
          top="310px"
          transform="translateX(-50%)"
          fontSize="md"
          color="#9F7AEA"
          opacity={
            result
              ? result.progress?.gateway?.active ||
                result.progress?.gateway?.completed
                ? 1
                : 0
              : 1
          }
          zIndex={2}
          bg="rgba(0, 0, 0, 0.6)"
          px={2}
          borderRadius="sm"
        >
          Ask Gateway
        </Text>
        {result?.timing?.gateway && result?.progress?.gateway?.completed && (
          <Text
            position="absolute"
            left="50%"
            top="350px"
            transform="translateX(-50%)"
            fontSize="sm"
            color="gray.400"
            zIndex={2}
            bg="#111"
            px={2}
          >
            {result?.timing?.gateway}ms
          </Text>
        )}

        {/* Return Data line */}
        <Box
          position="absolute"
          right="20%"
          top="410px"
          width="calc(60% - 4px)"
          height="2px"
          bg="#48BB78"
          opacity={
            result
              ? result.progress?.return?.active
                ? 0.4
                : result.progress?.return?.completed
                ? 1
                : 0
              : 1
          }
          animation={
            result?.progress?.return?.active
              ? `${blinkAnimation} 1s infinite`
              : "none"
          }
          display="flex"
          justifyContent="flex-start"
          alignItems="center"
          zIndex={2}
          _after={{
            content: '""',
            position: "absolute",
            left: "-8px",
            borderRight: "12px solid #48BB78",
            borderTop: "6px solid transparent",
            borderBottom: "6px solid transparent",
            opacity: result
              ? result.progress?.return?.active
                ? 0.4
                : result.progress?.return?.completed
                ? 1
                : 0
              : 1,
          }}
        />
        <Text
          position="absolute"
          left="50%"
          top="390px"
          transform="translateX(-50%)"
          fontSize="md"
          color="#48BB78"
          opacity={
            result
              ? result?.progress?.return?.active ||
                result?.progress?.return?.completed
                ? 1
                : 0
              : 1
          }
          zIndex={2}
          bg="rgba(0, 0, 0, 0.6)"
          px={2}
          borderRadius="sm"
        >
          Return Data
        </Text>
        {result?.timing?.return && result?.progress?.return?.completed && (
          <Text
            position="absolute"
            left="50%"
            top="430px"
            transform="translateX(-50%)"
            fontSize="sm"
            color="gray.400"
            zIndex={2}
            bg="#111"
            px={2}
          >
            {result?.timing?.return}ms
          </Text>
        )}

        {/* Verify/Decode Data line */}
        <Box
          position="absolute"
          left="20%"
          top="490px"
          width="calc(30% - 4px)"
          height="2px"
          bg="#ED8936"
          opacity={
            result
              ? result.progress?.verify?.active
                ? 0.4
                : result.progress?.verify?.completed
                ? 1
                : 0
              : 1
          }
          animation={
            result?.progress?.verify?.active
              ? `${blinkAnimation} 1s infinite`
              : "none"
          }
          display="flex"
          justifyContent="flex-end"
          alignItems="center"
          zIndex={2}
          _after={{
            content: '""',
            position: "absolute",
            right: "-8px",
            borderLeft: "12px solid #ED8936",
            borderTop: "6px solid transparent",
            borderBottom: "6px solid transparent",
            opacity: result
              ? result.progress?.verify?.active
                ? 0.4
                : result.progress?.verify?.completed
                ? 1
                : 0
              : 1,
          }}
        />
        <Text
          position="absolute"
          left="35%"
          top="470px"
          transform="translateX(-50%)"
          fontSize="md"
          color="#ED8936"
          opacity={
            result
              ? result.progress?.verify?.active ||
                result.progress?.verify?.completed
                ? 1
                : 0
              : 1
          }
          zIndex={2}
          bg="rgba(0, 0, 0, 0.6)"
          px={2}
          borderRadius="sm"
        >
          Verify/Decode Data
        </Text>
        {result?.timing?.verify && result?.progress?.verify?.completed && (
          <Text
            position="absolute"
            left="35%"
            top="510px"
            transform="translateX(-50%)"
            fontSize="sm"
            color="gray.400"
            zIndex={2}
            bg="#111"
            px={2}
          >
            {result?.timing?.verify}ms
          </Text>
        )}

        {/* Final Return Data line */}
        <Box
          position="absolute"
          right="50%"
          top="570px"
          width="calc(30% - 4px)"
          height="2px"
          bg="#38B2AC"
          opacity={
            result
              ? result.progress?.final?.active
                ? 0.4
                : result.progress?.final?.completed
                ? 1
                : 0
              : 1
          }
          animation={
            result?.progress?.final?.active
              ? `${blinkAnimation} 1s infinite`
              : "none"
          }
          display="flex"
          justifyContent="flex-start"
          alignItems="center"
          zIndex={2}
          _after={{
            content: '""',
            position: "absolute",
            left: "-8px",
            borderRight: "12px solid #38B2AC",
            borderTop: "6px solid transparent",
            borderBottom: "6px solid transparent",
            opacity: result
              ? result.progress?.final?.active
                ? 0.4
                : result.progress?.final?.completed
                ? 1
                : 0
              : 1,
          }}
        />
        <Text
          position="absolute"
          left="35%"
          top="550px"
          transform="translateX(-50%)"
          fontSize="md"
          color="#38B2AC"
          opacity={
            result
              ? result.progress?.final?.active ||
                result.progress?.final?.completed
                ? 1
                : 0
              : 1
          }
          zIndex={2}
          bg="rgba(0, 0, 0, 0.6)"
          px={2}
          borderRadius="sm"
        >
          Return Data
        </Text>
      </Box>
    );
  };

  return (
    <Container maxW="container.lg" py={8}>
      <VStack spacing={6} align="stretch">
        <Center>
          <Heading as="h1" size="xl" mb={6}>
            ENS CCIP Read Visualization
          </Heading>
        </Center>

        <Center gap="4">
          <Input
            placeholder="eg: jesse.base.eth (CCIP ENS domain)"
            value={ensName}
            onChange={(e) => setEnsName(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            maxW="20rem"
          />
          <Center>
            <Button
              colorScheme="blue"
              onClick={handleResolve}
              isLoading={loading}
              loadingText="Resolving..."
              maxW="10rem"
            >
              Resolve
            </Button>
          </Center>
        </Center>

        <Box ref={visualizationRef}>
          <ProcessDiagram />
        </Box>

        {(loading || (result && result.resolvedAddress)) && (
          <Center>
            <VStack
              spacing={4}
              align="stretch"
              p={4}
              borderRadius="md"
              border="1px solid"
              borderColor="whiteAlpha.300"
            >
              <Box>
                <Text fontWeight="bold" mb={2} color="blue.300">
                  Resolved Address:
                </Text>
                {loading ? (
                  <Skeleton height="32px" width="330px" />
                ) : (
                  <Code
                    p={2}
                    borderRadius="md"
                    bg="whiteAlpha.200"
                    color="gray.100"
                  >
                    {result?.resolvedAddress}
                  </Code>
                )}
              </Box>
            </VStack>
          </Center>
        )}

        {/* Reference Links */}
        <Box mt={8} pt={4} borderTop="1px solid" borderColor="whiteAlpha.300">
          <Text fontWeight="bold" mb={3}>
            References:
          </Text>
          <VStack align="stretch" spacing={2}>
            <Link
              href="https://docs.ens.domains/resolvers/ccip-read"
              isExternal
              color="blue.400"
              _hover={{ textDecoration: "underline" }}
            >
              ENS CCIP Read Documentation
            </Link>
            <Link
              href="https://eip.tools/eip/3668"
              isExternal
              color="blue.400"
              _hover={{ textDecoration: "underline" }}
            >
              ERC-3668 Specification
            </Link>
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
}
