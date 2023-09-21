"use client";

import { useState, useEffect } from "react";
import { HStack, Heading, Input, Button, Text, Box } from "@chakra-ui/react";
import { Layout } from "@/components/Layout";
import CopyToClipboard from "@/components/CopyToClipboard";
import DarkSelect from "@/components/DarkSelect";
import { SelectedOptionState } from "@/types";

const timeOptions = ["minutes", "hours", "days"];

export default function Epoch() {
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
          isCreatable
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
    </Layout>
  );
}
