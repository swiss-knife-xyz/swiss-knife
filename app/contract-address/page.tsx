"use client";

import { useEffect, useState } from "react";
import { Heading, Table, Tbody, Tr, Td } from "@chakra-ui/react";
import { getContractAddress, Hex } from "viem";
import { Layout } from "@/components/Layout";
import { InputField } from "@/components/InputField";
import { Label } from "@/components/Label";

const DetermineContractAddress = () => {
  const [deployerAddress, setDeployerAddress] = useState<string>();
  const [nonce, setNonce] = useState<string>();
  const [contractAddress, setContractAddress] = useState<string>();

  useEffect(() => {
    if (deployerAddress && nonce) {
      try {
        setContractAddress(
          getContractAddress({
            from: deployerAddress as Hex,
            nonce: BigInt(nonce),
          })
        );
      } catch {}
    }
  }, [deployerAddress, nonce]);

  return (
    <Layout>
      <Heading color={"custom.pale"}>Determine Contract Address</Heading>
      <Table mt={"3rem"} variant={"unstyled"}>
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
