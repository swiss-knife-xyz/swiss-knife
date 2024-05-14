"use client";

import { useState, useEffect } from "react";
import {
  HStack,
  Heading,
  Input,
  Button,
  Text,
  Box,
  Divider,
  Container,
  FormControl,
  FormLabel,
  Center,
} from "@chakra-ui/react";
import { ethers } from "ethers";
import EthDater from "ethereum-block-by-date";
import { Layout } from "@/components/Layout";
import { CopyToClipboard } from "@/components/CopyToClipboard";
import { DarkSelect } from "@/components/DarkSelect";
import { SelectedOptionState } from "@/types";
import { DarkButton } from "@/components/DarkButton";
import { c, chainIdToChain } from "@/data/common";

const timeOptions = ["minutes", "hours", "days"];

const networkOptions: { label: string; value: number }[] = Object.keys(c).map(
  (k, i) => ({
    label: c[k].name,
    value: c[k].id,
  })
);

const Epoch = () => {
  const [timestamp, setTimestamp] = useState<number>(
    Math.floor(Date.now() / 1000)
  );
  const [selectedTimeOption, setSelectedTimeOption] =
    useState<SelectedOptionState>({
      label: timeOptions[0],
      value: timeOptions[0],
    });
  const [futureTimeInput, setFutureTimeInput] = useState<number>();
  const [futureTimestamp, setFutureTimestamp] = useState<number>();
  const [toHumanDateInput, setToHumanDateInput] = useState<number>();
  const [humanDateUTC, setHumanDateUTC] = useState<string>();
  const [humanDateLocal, setHumanDateLocal] = useState<string>();

  // dateTime to block
  const [dateTime, setDateTime] = useState<string>();
  const [selectedNetworkOption, setSelectedNetworkOption] =
    useState<SelectedOptionState>(networkOptions[0]);
  const [getBlockIsLoading, setGetBlockIsLoading] = useState<boolean>(false);
  const [blockNumber, setBlockNumber] = useState<number>();
  const [blockDate, setBlockDate] = useState<string>();

  useEffect(() => {
    setInterval(() => {
      setTimestamp(Math.floor(Date.now() / 1000));
    }, 1000);
  }, []);

  return (
    <Layout>
      <Heading>Unix Epoch Timestamp</Heading>
      <HStack mt="8">
        <Text>Current timestamp:</Text>
        <Text color="blue.100">{timestamp}</Text>
        <CopyToClipboard textToCopy={timestamp.toString()} />
      </HStack>
      <HStack mt="6">
        <Button
          onClick={() => {
            if (!futureTimeInput) return;

            const currentTimestamp = Math.floor(Date.now() / 1000);
            let multiplier: number = 1;
            if (selectedTimeOption) {
              switch (selectedTimeOption.value) {
                case "minutes": {
                  multiplier = 60;
                  break;
                }
                case "hours": {
                  multiplier = 60 * 60;
                  break;
                }
                case "days": {
                  multiplier = 60 * 60 * 24;
                  break;
                }
              }
            }

            setFutureTimestamp(currentTimestamp + futureTimeInput * multiplier);
          }}
        >
          Get timestamp
        </Button>
        <Input
          type="number"
          w="4rem"
          placeholder="0"
          value={futureTimeInput}
          onChange={(e) => setFutureTimeInput(parseFloat(e.target.value))}
        />
        <DarkSelect
          boxProps={{
            w: "9rem",
          }}
          selectedOption={selectedTimeOption}
          setSelectedOption={setSelectedTimeOption}
          options={timeOptions.map((str) => ({
            label: str,
            value: str,
          }))}
        />
        <Text>from now: </Text>
        {futureTimestamp && (
          <>
            <Text color={"blue.200"}>{futureTimestamp}</Text>
            <CopyToClipboard textToCopy={futureTimestamp.toString()} />
          </>
        )}
      </HStack>
      <HStack mt="8">
        <Input
          autoFocus
          type="number"
          w="15rem"
          placeholder="Timestamp in seconds"
          value={toHumanDateInput}
          onChange={(e) => setToHumanDateInput(parseFloat(e.target.value))}
        />
        <Button
          onClick={() => {
            if (!toHumanDateInput) return;

            const d = new Date(toHumanDateInput * 1_000);
            setHumanDateUTC(d.toUTCString());
            setHumanDateLocal(d.toString());
          }}
        >
          Timestamp to Human-readable
        </Button>
      </HStack>
      {humanDateUTC && humanDateLocal && (
        <Box mt="4">
          <HStack>
            <Text color="blue.200">UTC:</Text>
            <Text>{humanDateUTC}</Text>
          </HStack>
          <HStack>
            <Text color="blue.200">Local:</Text>
            <Text>{humanDateLocal}</Text>
          </HStack>
        </Box>
      )}
      <Divider mt={10} />
      <Box my={5}>
        <Heading size={"md"}>Get Block by Date & Time</Heading>
        <Container>
          <FormControl mt={8}>
            <FormLabel>Date & Time (in your timezone)</FormLabel>
            <Center>
              <Input
                type={"datetime-local"}
                maxW="15rem"
                autoComplete="off"
                placeholder="0x00..."
                value={dateTime}
                onChange={(e) => {
                  setDateTime(e.target.value);
                }}
                bg={"blackAlpha.300"}
              />
            </Center>
          </FormControl>
          <DarkSelect
            boxProps={{
              w: "100%",
              mt: "2",
            }}
            selectedOption={selectedNetworkOption}
            setSelectedOption={setSelectedNetworkOption}
            options={networkOptions}
          />
          <Center mt={4} flexDir={"column"}>
            <DarkButton
              onClick={async () => {
                if (!dateTime) return;

                setGetBlockIsLoading(true);
                try {
                  const provider = new ethers.JsonRpcProvider(
                    chainIdToChain[
                      parseInt(selectedNetworkOption!.value.toString())
                    ]?.rpcUrls.default.http[0]
                  );

                  const dater = new EthDater(
                    // @ts-ignore
                    provider // Ethers provider, required.
                  );

                  console.log({ dateTime });

                  const { block, date } = await dater.getDate(
                    new Date(dateTime), // Date, required. Any valid moment.js value: string, milliseconds, Date() object, moment() object.
                    true // Block after, optional. Search for the nearest block before or after the given date. By default true.
                  );

                  setBlockNumber(block);
                  setBlockDate(date);
                } catch {}
                setGetBlockIsLoading(false);
              }}
              isLoading={getBlockIsLoading}
              isDisabled={!dateTime}
            >
              Get Block
            </DarkButton>
            {blockNumber && blockDate && (
              <Box mt={5}>
                <HStack>
                  <Text color={"whiteAlpha.700"}>Block Number:</Text>
                  <Text>{blockNumber}</Text>
                </HStack>
                <HStack>
                  <Text color={"whiteAlpha.700"}>Block Date:</Text>
                  <Text>{blockDate}</Text>
                </HStack>
              </Box>
            )}
          </Center>
        </Container>
      </Box>
    </Layout>
  );
};

export default Epoch;
