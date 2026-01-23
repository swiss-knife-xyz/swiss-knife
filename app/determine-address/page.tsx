"use client";

import { useEffect, useState } from "react";
import { Heading, Table, Tbody, Tr, Td, Textarea, Box } from "@chakra-ui/react";
import { getContractAddress, Hex, toBytes, isHex } from "viem";
import { Layout } from "@/components/Layout";
import { InputField } from "@/components/InputField";
import { Label } from "@/components/Label";
import TabsSelector from "@/components/Tabs/TabsSelector";

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

  // Calculate address for CREATE
  useEffect(() => {
    if (mode !== "CREATE") return;

    if (deployerAddress && nonce) {
      try {
        setContractAddress(
          getContractAddress({
            from: deployerAddress as Hex,
            nonce: BigInt(nonce),
          })
        );
      } catch {
        setContractAddress("");
      }
    } else {
      setContractAddress("");
    }
  }, [mode, deployerAddress, nonce]);

  // Calculate address for CREATE2
  useEffect(() => {
    if (mode !== "CREATE2") return;

    if (deployerAddress && bytecode && salt) {
      try {
        // Determine salt format - if it's a hex string, use as-is, otherwise convert to bytes
        const saltValue = isHex(salt) ? (salt as Hex) : toBytes(salt);

        setContractAddress(
          getContractAddress({
            from: deployerAddress as Hex,
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
  }, [mode, deployerAddress, bytecode, salt]);

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
              <InputField
                autoFocus
                placeholder="address"
                value={deployerAddress}
                onChange={(e) => {
                  setDeployerAddress(e.target.value);
                }}
              />
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
