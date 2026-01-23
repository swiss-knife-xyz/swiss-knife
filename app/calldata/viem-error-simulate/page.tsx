"use client";

import React, { useState } from "react";
import {
  Heading,
  Box,
  Flex,
  Textarea,
  Alert,
  AlertDescription,
  HStack,
  Link,
} from "@chakra-ui/react";
import { DarkSelect } from "@/components/DarkSelect";
import { SelectedOptionState } from "@/types";
import { mainnet } from "viem/chains";
import { c } from "@/data/common";
import { DarkButton } from "@/components/DarkButton";
import { ExternalLinkIcon } from "@chakra-ui/icons"; // Import the correct icon
import { generateTenderlyUrl } from "@/utils";
import { zeroAddress } from "viem";

const networkOptions: { label: string; value: number }[] = Object.keys(c).map(
  (k, i) => ({
    label: c[k].name,
    value: c[k].id,
  })
);

const ViemErrorSimulate = () => {
  const [selectedNetworkOption, setSelectedNetworkOption] =
    useState<SelectedOptionState>({
      label: mainnet.name,
      value: mainnet.id,
    });
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [tenderlyUrl, setTenderlyUrl] = useState("");

  const parseTransactionData = (text: string) => {
    try {
      // Extract from address
      const fromMatch = text.match(/from:\s+(\w+)/);
      const from = fromMatch ? fromMatch[1] : zeroAddress;

      // Extract to address
      const toMatch = text.match(/to:\s+(\w+)/);
      const to = toMatch ? toMatch[1] : "";

      // Extract value and convert to wei
      const valueMatch = text.match(/value:\s+([\d.]+)\s+ETH/);
      const valueEth = valueMatch ? parseFloat(valueMatch[1]) : 0;
      const valueWei = (valueEth * 1e18).toString();

      // Extract data
      const dataMatch = text.match(/data:\s+((0x)?[a-fA-F0-9]+)/);
      let data = "";
      if (dataMatch) {
        data = dataMatch[1].trim();
        if (!data.startsWith("0x")) {
          data = "0x" + data;
        }
      }

      if (!from || !to || !valueWei || !data) {
        throw new Error("Failed to parse one or more required fields");
      }

      return { from, to, value: valueWei, data };
    } catch (err) {
      throw new Error(
        "Failed to parse transaction data. Please check the input format."
      );
    }
  };

  const handleSimulate = () => {
    setError("");
    setTenderlyUrl("");
    try {
      const txData = parseTransactionData(input);
      const url = generateTenderlyUrl(
        txData,
        selectedNetworkOption!.value as number
      );
      setTenderlyUrl(url);
      window.open(url, "_blank");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <Flex flexDir={"column"} alignItems={"center"} w="100%" px="4rem" pb="2rem">
      <Heading color={"custom.pale"}>Viem Error Simulate</Heading>
      <Box mt="2rem" minW="20rem">
        <DarkSelect
          boxProps={{
            w: "100%",
            mt: "2",
          }}
          selectedOption={selectedNetworkOption}
          setSelectedOption={setSelectedNetworkOption}
          options={networkOptions}
        />
      </Box>
      <Box mt="1rem">
        <Box>Paste your viem contract error here...</Box>
        <Textarea
          w="30rem"
          maxWidth="100%"
          height="250px"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Example:

Error
Execution reverted for an unknown reason.

Raw Call Arguments:
  from:   0xabc00...
  to:     0xfff00...
  value:  0.123 ETH
  data:   0x860f81c4000...
`}
          resize="none"
          data-gramm="false"
        />
      </Box>
      <DarkButton mt="1rem" onClick={handleSimulate}>
        Simulate on Tenderly
      </DarkButton>
      {error && (
        <Alert status="error" variant="subtle" mt="1rem">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {tenderlyUrl && (
        <Alert bg="blue.400" variant="subtle" mt="1rem" rounded={"lg"}>
          <AlertDescription>
            <HStack>
              <Link href={tenderlyUrl} textDecor={"underline"} isExternal>
                Open Tenderly Simulation
              </Link>
              <ExternalLinkIcon />
            </HStack>
          </AlertDescription>
        </Alert>
      )}
    </Flex>
  );
};

export default ViemErrorSimulate;
