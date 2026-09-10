"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Heading,
  Textarea,
  Box,
  HStack,
  VStack,
  Text,
  Spacer,
  Avatar,
  Spinner,
  Tooltip,
  Icon,
} from "@chakra-ui/react";
import { FiTarget, FiUser, FiHash, FiCode, FiKey, FiPackage } from "react-icons/fi";
import { CopyToClipboard } from "@/components/CopyToClipboard";
import { getContractAddress, Hex, toBytes, isHex, isAddress } from "viem";
import { Layout } from "@/components/Layout";
import { InputField } from "@/components/InputField";
import TabsSelector from "@/components/Tabs/TabsSelector";
import { resolveNameToAddress, resolveAddressToName, getNameAvatar, isResolvableName, slicedText } from "@/utils";
import debounce from "lodash/debounce";

type OpcodeMode = "CREATE" | "CREATE2";

const DetermineContractAddress = () => {
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const mode: OpcodeMode = selectedTabIndex === 0 ? "CREATE" : "CREATE2";

  // CREATE inputs
  const [deployerAddress, setDeployerAddress] = useState<string>("");
  const [nonce, setNonce] = useState<string>("");

  // CREATE2 inputs
  const [bytecode, setBytecode] = useState<string>("");
  const [salt, setSalt] = useState<string>("");

  // Output
  const [contractAddress, setContractAddress] = useState<string>("");

  // ENS resolution state
  const [ensName, setEnsName] = useState("");
  const [ensAvatar, setEnsAvatar] = useState("");
  const [resolvedAddress, setResolvedAddress] = useState("");
  const [isResolvingEns, setIsResolvingEns] = useState(false);
  const [lastResolvedValue, setLastResolvedValue] = useState("");

  // Debounced name resolution (ENS, Basename, etc.)
  const resolveEns = useCallback(
    debounce(async (val: string) => {
      if (!val || val === lastResolvedValue) return;

      try {
        if (isResolvableName(val)) {
          // Looks like a name (ENS, Basename, etc.)
          setIsResolvingEns(true);
          const address = await resolveNameToAddress(val);
          if (address) {
            setResolvedAddress(address);
            setEnsName(val);
            setLastResolvedValue(val);
          } else {
            setEnsName("");
            setResolvedAddress("");
          }
        } else if (isAddress(val)) {
          // It's an address, try to get reverse resolution
          setIsResolvingEns(true);
          setResolvedAddress(val);
          try {
            const name = await resolveAddressToName(val);
            if (name) {
              setEnsName(name);
            } else {
              setEnsName("");
            }
          } catch {
            setEnsName("");
          }
          setLastResolvedValue(val);
        } else {
          setEnsName("");
          setResolvedAddress("");
        }
      } catch (error) {
        console.error("Error resolving name:", error);
        setEnsName("");
        setResolvedAddress("");
      } finally {
        setIsResolvingEns(false);
      }
    }, 500),
    [lastResolvedValue]
  );

  // Resolve ENS when deployerAddress changes
  useEffect(() => {
    if (deployerAddress && deployerAddress !== lastResolvedValue) {
      resolveEns(deployerAddress);
    } else if (!deployerAddress) {
      setEnsName("");
      setResolvedAddress("");
      setLastResolvedValue("");
    }
  }, [deployerAddress, resolveEns, lastResolvedValue]);

  // Fetch avatar when ensName changes
  useEffect(() => {
    if (ensName) {
      getNameAvatar(ensName).then((avatar) => {
        setEnsAvatar(avatar || "");
      });
    } else {
      setEnsAvatar("");
    }
  }, [ensName]);

  // Calculate address for CREATE
  useEffect(() => {
    if (mode !== "CREATE") return;

    const addressToUse = resolvedAddress || deployerAddress;
    if (addressToUse && isAddress(addressToUse) && nonce) {
      try {
        setContractAddress(
          getContractAddress({
            from: addressToUse as Hex,
            nonce: BigInt(nonce),
          })
        );
      } catch {
        setContractAddress("");
      }
    } else {
      setContractAddress("");
    }
  }, [mode, deployerAddress, resolvedAddress, nonce]);

  // Calculate address for CREATE2
  useEffect(() => {
    if (mode !== "CREATE2") return;

    const addressToUse = resolvedAddress || deployerAddress;
    if (addressToUse && isAddress(addressToUse) && bytecode && salt) {
      try {
        // Determine salt format - if it's a hex string, use as-is, otherwise convert to bytes
        const saltValue = isHex(salt) ? (salt as Hex) : toBytes(salt);

        setContractAddress(
          getContractAddress({
            from: addressToUse as Hex,
            opcode: "CREATE2",
            bytecode: bytecode as Hex,
            salt: saltValue,
          })
        );
      } catch {
        setContractAddress("");
      }
    } else {
      setContractAddress("");
    }
  }, [mode, deployerAddress, resolvedAddress, bytecode, salt]);

  // Clear output when switching modes
  useEffect(() => {
    setContractAddress("");
  }, [mode]);

  return (
    <Layout>
      <Box
        p={6}
        bg="rgba(0, 0, 0, 0.05)"
        backdropFilter="blur(5px)"
        borderRadius="xl"
        border="1px solid"
        borderColor="whiteAlpha.50"
        maxW="800px"
        mx="auto"
      >
        {/* Page Header */}
        <Box mb={8} textAlign="center">
          <HStack justify="center" spacing={3} mb={4}>
            <Icon as={FiTarget} color="blue.400" boxSize={8} />
            <Heading size="xl" color="gray.100" fontWeight="bold" letterSpacing="tight">
              Determine Contract Address
            </Heading>
          </HStack>
          <Text color="gray.400" fontSize="lg" maxW="600px" mx="auto">
            Calculate contract addresses for CREATE and CREATE2 deployments
          </Text>
        </Box>

        <Box
          p={4}
          bg="whiteAlpha.50"
          borderRadius="lg"
          border="1px solid"
          borderColor="whiteAlpha.200"
        >
          <TabsSelector
            tabs={["CREATE", "CREATE2"]}
            selectedTabIndex={selectedTabIndex}
            setSelectedTabIndex={setSelectedTabIndex}
            mb={6}
          />

          <VStack spacing={4} align="stretch">
            {/* Deployer Address */}
            <HStack
              spacing={4}
              p={4}
              bg="whiteAlpha.50"
              borderRadius="lg"
              border="1px solid"
              borderColor="whiteAlpha.100"
            >
              <Box minW="100px">
                <VStack spacing={1} align="start">
                  <HStack spacing={2}>
                    <Icon as={FiUser} color="blue.400" boxSize={4} />
                    <Text color="gray.300" fontWeight="medium" fontSize="sm">
                      Deployer
                    </Text>
                  </HStack>
                  {isResolvingEns && <Spinner size="xs" color="blue.400" />}
                  {ensName && !isResolvingEns && (
                    <HStack px={2} py={0.5} bg="whiteAlpha.200" rounded="md">
                      {ensAvatar && (
                        <Avatar
                          src={ensAvatar}
                          w="0.875rem"
                          h="0.875rem"
                          ignoreFallback
                        />
                      )}
                      <Text fontSize="xs" color="gray.400">{ensName}</Text>
                    </HStack>
                  )}
                </VStack>
              </Box>
              <Box flex={1}>
                <InputField
                  autoFocus
                  placeholder="address or ENS"
                  value={deployerAddress}
                  onChange={(e) => {
                    setDeployerAddress(e.target.value.trim());
                  }}
                />
                {resolvedAddress &&
                  !isResolvingEns &&
                  resolvedAddress !== deployerAddress && (
                    <HStack spacing={1} mt={1}>
                      <Tooltip label={resolvedAddress} placement="top">
                        <Text fontSize="xs" color="gray.500" cursor="default">
                          Resolved: {slicedText(resolvedAddress)}
                        </Text>
                      </Tooltip>
                      <CopyToClipboard textToCopy={resolvedAddress} size="xs" />
                    </HStack>
                  )}
              </Box>
            </HStack>

            {mode === "CREATE" && (
              <HStack
                spacing={4}
                p={4}
                bg="whiteAlpha.50"
                borderRadius="lg"
                border="1px solid"
                borderColor="whiteAlpha.100"
              >
                <Box minW="100px">
                  <HStack spacing={2}>
                    <Icon as={FiHash} color="blue.400" boxSize={4} />
                    <Text color="gray.300" fontWeight="medium" fontSize="sm">
                      Nonce
                    </Text>
                  </HStack>
                </Box>
                <Box flex={1}>
                  <InputField
                    placeholder="e.g. 0, 1, 2..."
                    value={nonce}
                    onChange={(e) => {
                      setNonce(e.target.value);
                    }}
                  />
                </Box>
              </HStack>
            )}

            {mode === "CREATE2" && (
              <>
                <Box
                  p={4}
                  bg="whiteAlpha.50"
                  borderRadius="lg"
                  border="1px solid"
                  borderColor="whiteAlpha.100"
                >
                  <HStack spacing={2} mb={3}>
                    <Icon as={FiCode} color="blue.400" boxSize={4} />
                    <Text color="gray.300" fontWeight="medium" fontSize="sm">
                      Bytecode
                    </Text>
                  </HStack>
                  <Textarea
                    placeholder="0x..."
                    value={bytecode}
                    onChange={(e) => {
                      setBytecode(e.target.value);
                    }}
                    minH="100px"
                    bg="whiteAlpha.50"
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                    _hover={{ borderColor: "whiteAlpha.300" }}
                    _focus={{
                      borderColor: "blue.400",
                      boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
                    }}
                    color="gray.100"
                    _placeholder={{ color: "gray.500" }}
                    fontFamily="mono"
                    fontSize="sm"
                  />
                </Box>
                <HStack
                  spacing={4}
                  p={4}
                  bg="whiteAlpha.50"
                  borderRadius="lg"
                  border="1px solid"
                  borderColor="whiteAlpha.100"
                >
                  <Box minW="100px">
                    <HStack spacing={2}>
                      <Icon as={FiKey} color="blue.400" boxSize={4} />
                      <Text color="gray.300" fontWeight="medium" fontSize="sm">
                        Salt
                      </Text>
                    </HStack>
                  </Box>
                  <Box flex={1}>
                    <InputField
                      placeholder="0x... (hex) or any string"
                      value={salt}
                      onChange={(e) => {
                        setSalt(e.target.value);
                      }}
                    />
                  </Box>
                </HStack>
              </>
            )}

            {/* Result */}
            <HStack
              spacing={4}
              p={4}
              bg="whiteAlpha.100"
              borderRadius="lg"
              border="1px solid"
              borderColor="whiteAlpha.200"
            >
              <Box minW="100px">
                <HStack spacing={2}>
                  <Icon as={FiPackage} color="green.400" boxSize={4} />
                  <Text color="gray.300" fontWeight="medium" fontSize="sm">
                    Contract
                  </Text>
                </HStack>
              </Box>
              <Box flex={1}>
                <InputField
                  placeholder="determined contract address"
                  value={contractAddress}
                  onChange={() => {}}
                  isReadOnly
                  cursor="text"
                />
              </Box>
            </HStack>
          </VStack>
        </Box>
      </Box>
    </Layout>
  );
};

export default DetermineContractAddress;
