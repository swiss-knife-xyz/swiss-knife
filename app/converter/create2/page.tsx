"use client";

import { useState, useEffect } from "react";
import { Heading, Table, Tbody, Tr, Td } from "@chakra-ui/react";
import { getCreate2Address, keccak256, Hex } from "viem";
import { InputField } from "@/components/InputField";
import { Label } from "@/components/Label";

const Create2Calculator = () => {
  const [deployerAddress, setDeployerAddress] = useState<string>("");
  const [salt, setSalt] = useState<string>("");
  const [initCode, setInitCode] = useState<string>("");
  const [contractAddress, setContractAddress] = useState<string>("");

  useEffect(() => {
    if (deployerAddress && salt && initCode) {
      try {
        const address = getCreate2Address({
          from: deployerAddress as Hex,
          salt: salt as Hex,
          bytecodeHash: keccak256(initCode as Hex),
        });
        setContractAddress(address);
      } catch (error) {
        setContractAddress("Invalid input");
      }
    } else {
      setContractAddress("");
    }
  }, [deployerAddress, salt, initCode]);

  return (
    <>
      <Heading color={"custom.pale"}>CREATE2 Calculator</Heading>
      <Table mt={"3rem"} variant={"unstyled"}>
        <Tbody>
          <Tr>
            <Label>Deployer</Label>
            <Td>
              <InputField
                autoFocus
                placeholder="0x..."
                value={deployerAddress}
                onChange={(e) => setDeployerAddress(e.target.value)}
              />
            </Td>
          </Tr>
          <Tr>
            <Label>Salt</Label>
            <Td>
              <InputField
                placeholder="bytes32 (e.g., 0x...)"
                value={salt}
                onChange={(e) => setSalt(e.target.value)}
              />
            </Td>
          </Tr>
          <Tr>
            <Label>Init Code</Label>
            <Td>
              <InputField
                placeholder="bytes (e.g., 0x...)"
                value={initCode}
                onChange={(e) => setInitCode(e.target.value)}
              />
            </Td>
          </Tr>
          <Tr>
            <Label>Contract Address</Label>
            <Td>
              <InputField
                placeholder="Determined contract address"
                value={contractAddress}
                onChange={() => {}}
                isReadOnly
              />
            </Td>
          </Tr>
        </Tbody>
      </Table>
    </>
  );
};

export default Create2Calculator;
