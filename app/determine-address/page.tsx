"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Heading,
  Table,
  Tbody,
  Tr,
  Td,
  Textarea,
  Box,
  HStack,
  Text,
  Spacer,
  Avatar,
  Spinner,
  Tooltip,
} from "@chakra-ui/react";
import { CopyToClipboard } from "@/components/CopyToClipboard";
import { getContractAddress, Hex, toBytes, isHex, isAddress } from "viem";
import { Layout } from "@/components/Layout";
import { InputField } from "@/components/InputField";
import { Label } from "@/components/Label";
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
      <Heading color={"custom.pale"}>Determine Contract Address</Heading>

      <TabsSelector
        tabs={["CREATE", "CREATE2"]}
        selectedTabIndex={selectedTabIndex}
        setSelectedTabIndex={setSelectedTabIndex}
        mt="2rem"
      />

      <Table mt={"2rem"} variant={"unstyled"}>
        <Tbody>
          <Tr>
            <Label>Deployer</Label>
            <Td>
              <Box>
                <HStack mb={2}>
                  <Spacer />
                  {isResolvingEns && <Spinner size="xs" />}
                  {ensName && !isResolvingEns && (
                    <HStack px={2} bg="whiteAlpha.200" rounded="md">
                      {ensAvatar && (
                        <Avatar
                          src={ensAvatar}
                          w="1.2rem"
                          h="1.2rem"
                          ignoreFallback
                        />
                      )}
                      <Text fontSize="sm">{ensName}</Text>
                    </HStack>
                  )}
                  {resolvedAddress &&
                    !isResolvingEns &&
                    resolvedAddress !== deployerAddress && (
                      <HStack spacing={1}>
                        <Tooltip label={resolvedAddress} placement="top">
                          <Text fontSize="xs" color="whiteAlpha.600" cursor="default">
                            {slicedText(resolvedAddress)}
                          </Text>
                        </Tooltip>
                        <CopyToClipboard textToCopy={resolvedAddress} size="xs" />
                      </HStack>
                    )}
                </HStack>
                <InputField
                  autoFocus
                  placeholder="address or ENS"
                  value={deployerAddress}
                  onChange={(e) => {
                    setDeployerAddress(e.target.value.trim());
                  }}
                />
              </Box>
            </Td>
          </Tr>

          {mode === "CREATE" && (
            <Tr>
              <Label>Nonce</Label>
              <Td>
                <InputField
                  placeholder="nonce"
                  value={nonce}
                  onChange={(e) => {
                    setNonce(e.target.value);
                  }}
                />
              </Td>
            </Tr>
          )}

          {mode === "CREATE2" && (
            <>
              <Tr>
                <Label>Bytecode</Label>
                <Td>
                  <Textarea
                    placeholder="0x..."
                    value={bytecode}
                    onChange={(e) => {
                      setBytecode(e.target.value);
                    }}
                    minH="100px"
                    bg="bg.900"
                    borderColor="whiteAlpha.300"
                    _hover={{ borderColor: "whiteAlpha.400" }}
                    _focus={{
                      borderColor: "blue.400",
                      boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
                    }}
                    fontFamily="mono"
                    fontSize="sm"
                  />
                </Td>
              </Tr>
              <Tr>
                <Label>Salt</Label>
                <Td>
                  <InputField
                    placeholder="0x... (hex) or any string"
                    value={salt}
                    onChange={(e) => {
                      setSalt(e.target.value);
                    }}
                  />
                </Td>
              </Tr>
            </>
          )}

          <Tr>
            <Label>Contract Address</Label>
            <Td>
              <InputField
                placeholder="determined contract address"
                value={contractAddress}
                onChange={() => {}}
                isReadOnly
              />
            </Td>
          </Tr>
        </Tbody>
      </Table>
    </Layout>
  );
};

export default DetermineContractAddress;
