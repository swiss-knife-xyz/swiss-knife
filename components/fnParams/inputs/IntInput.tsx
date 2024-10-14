import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Center,
  HStack,
  Input,
  InputLeftElement,
  InputProps,
} from "@chakra-ui/react";
import { InputField } from "@/components/InputField";
import { InputInfo } from "./InputInfo";
import { JsonFragment } from "ethers";
import { DarkSelect } from "@/components/DarkSelect";
import {
  ethFormatOptions,
  convertFrom,
  convertTo,
  ETHSelectedOptionState,
  EthFormatOption,
  convertUnixSecondsToGMT,
  convertGMTToUnixSeconds,
} from "@/utils";
import { stringify } from "viem";
import TabsSelector from "@/components/Tabs/TabsSelector";

// Types and Interfaces
interface IntInputProps extends InputProps {
  input: JsonFragment;
  value?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readFunctionIsError?: boolean;
}

const futureTimeOptions = ["minutes", "hours", "days"] as const;
export type FutureTimeOption = (typeof futureTimeOptions)[number];
export interface SelectedFutureTimeOptionState {
  label: FutureTimeOption;
  value: FutureTimeOption;
}

// Component
export const IntInput = ({
  input,
  value,
  onChange,
  readFunctionIsError,
  ...props
}: IntInputProps) => {
  // Refs
  const prevValueRef = useRef<string>("0");
  const buttonClickedRef = useRef<boolean>(false);

  // State
  const [selectedEthFormatOption, setSelectedEthFormatOption] =
    useState<ETHSelectedOptionState>({
      label: ethFormatOptions[0],
      value: ethFormatOptions[0],
    });
  const [showLocalTime, setShowLocalTime] = useState(false);
  const [timeSelectedTabIndex, setTimeSelectedTabIndex] = useState(0);
  const [currentTimestamp, setCurrentTimestamp] = useState<number>(
    Math.floor(Date.now() / 1000)
  );
  const [selectedFutureTimeOption, setSelectedFutureTimeOption] =
    useState<SelectedFutureTimeOptionState>({
      label: futureTimeOptions[0],
      value: futureTimeOptions[0],
    });
  const [futureTimeInput, setFutureTimeInput] = useState<number>();
  const [futureTimeInputError, setFutureTimeInputError] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Effects
  useEffect(() => {
    handleEthFormatOptionChange();
  }, [selectedEthFormatOption]);

  useEffect(() => {
    handleUnixTimeUpdate();
  }, [selectedEthFormatOption]);

  // Handlers
  const handleEthFormatOptionChange = () => {
    if (buttonClickedRef.current) {
      buttonClickedRef.current = false;
      prevValueRef.current = selectedEthFormatOption?.value?.toString() ?? "0";
      return;
    }

    if (selectedEthFormatOption) {
      let convertedValue = value;
      try {
        const weiAmount = convertFrom(
          {
            label: prevValueRef.current as EthFormatOption,
            value: prevValueRef.current as EthFormatOption,
          },
          value
        );
        convertedValue = convertTo(selectedEthFormatOption, weiAmount);

        if (selectedEthFormatOption.value === "Bps ↔️ %") {
          convertedValue = convertedValue?.slice(0, -1);
        } else if (selectedEthFormatOption.value === "Unix Time") {
          convertedValue = convertGMTToUnixSeconds(
            convertedValue?.toString() ?? ""
          ).toString();
        }
      } catch {}

      onChange({ target: { value: convertedValue } } as any);
    }
    prevValueRef.current = selectedEthFormatOption?.value?.toString() ?? "0";
  };

  const handleUnixTimeUpdate = () => {
    if (selectedEthFormatOption.value === "Unix Time") {
      const intervalId = setInterval(() => {
        setCurrentTimestamp(Math.floor(Date.now() / 1000));
      }, 1000);
      return () => clearInterval(intervalId);
    }
  };

  const handleConvertToWei = () => {
    buttonClickedRef.current = true;
    try {
      const conversion = convertFrom(selectedEthFormatOption, value);
      onChange({ target: { value: conversion } } as any);
      setSelectedEthFormatOption({
        label: ethFormatOptions[0],
        value: ethFormatOptions[0],
      });
    } catch (e: any) {
      setIsError(true);
      setErrorMsg(getErrorMessage(e));
    }
  };

  const getErrorMessage = (e: any) => {
    if (!value) return "Please enter a valid number";
    if (
      (value.includes(".") &&
        (selectedEthFormatOption.value === "ETH" ||
          selectedEthFormatOption.value === "Gwei" ||
          selectedEthFormatOption.value === "10^6")) ||
      selectedEthFormatOption.value === "Unix Time"
    ) {
      return "Please enter an integer value";
    }
    if (selectedEthFormatOption.value === "Bps ↔️ %") {
      return "Please enter a value between 0 and 10,000";
    }
    return stringify(e.message);
  };

  const handleSetFutureTimestamp = () => {
    if (!futureTimeInput) {
      setFutureTimeInputError(true);
      return;
    }

    const currentTimestamp = Math.floor(Date.now() / 1000);
    let multiplier = 1;
    switch (selectedFutureTimeOption.value) {
      case "minutes":
        multiplier = 60;
        break;
      case "hours":
        multiplier = 60 * 60;
        break;
      case "days":
        multiplier = 60 * 60 * 24;
        break;
    }

    onChange({
      target: {
        value: (currentTimestamp + futureTimeInput * multiplier).toString(),
      },
    } as any);
  };

  // Render helpers
  const renderInputField = () => (
    <InputField
      InputLeftElement={
        selectedEthFormatOption?.value === "Bps ↔️ %" ? (
          <InputLeftElement bg="whiteAlpha.100">%</InputLeftElement>
        ) : undefined
      }
      pl={selectedEthFormatOption?.value === "Bps ↔️ %" ? "14" : undefined}
      value={value}
      type={
        selectedEthFormatOption?.value === "Unix Time" ? "date-time" : "number"
      }
      placeholder=""
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        setIsError(false);
        onChange(e);
      }}
      {...props}
      isInvalid={isError || readFunctionIsError}
    />
  );

  const renderUnixTimeControls = () => (
    <Box>
      <HStack mt="1" ml="4" fontSize="sm" color="whiteAlpha.800">
        <Box>
          {
            (showLocalTime
              ? new Date(Number(value) * 1_000).toString()
              : convertUnixSecondsToGMT(Number(value))
            ).split("GMT")[0]
          }
        </Box>
        <Button size="xs" onClick={() => setShowLocalTime((prev) => !prev)}>
          {showLocalTime ? "Local" : "UTC"}
        </Button>
      </HStack>
      <Center flexDir="column">
        <Center mt={2} mb={1} fontSize="sm">
          ↑
        </Center>
        <Center fontSize="sm" fontWeight="bold">
          Convert from:
        </Center>
        <Box fontSize="sm">
          <TabsSelector
            mt={0}
            px={2}
            minH="2rem"
            rounded="md"
            tabs={["Current Time", "x Time from now"]}
            selectedTabIndex={timeSelectedTabIndex}
            setSelectedTabIndex={setTimeSelectedTabIndex}
          />
          {timeSelectedTabIndex === 0
            ? renderCurrentTimeTab()
            : renderFutureTimeTab()}
        </Box>
      </Center>
    </Box>
  );

  const renderCurrentTimeTab = () => (
    <HStack mt="8">
      <Box>Current timestamp:</Box>
      <Box color="blue.100">{currentTimestamp}</Box>
      <Button
        size="sm"
        onClick={() => {
          onChange({
            target: { value: currentTimestamp.toString() },
          } as any);
        }}
      >
        Set Value
      </Button>
    </HStack>
  );

  const renderFutureTimeTab = () => (
    <HStack mt="3">
      <Button size="sm" onClick={handleSetFutureTimestamp}>
        Set timestamp
      </Button>
      <Input
        size="sm"
        type="number"
        w="4rem"
        placeholder="0"
        rounded="md"
        value={futureTimeInput}
        onChange={(e) => {
          if (futureTimeInputError) {
            setFutureTimeInputError(false);
          }
          setFutureTimeInput(parseFloat(e.target.value));
        }}
        isInvalid={futureTimeInputError}
      />
      <DarkSelect
        boxProps={{
          w: "9rem",
        }}
        selectedOption={selectedFutureTimeOption}
        setSelectedOption={(value) =>
          setSelectedFutureTimeOption(value as SelectedFutureTimeOptionState)
        }
        options={futureTimeOptions.map((str) => ({
          label: str,
          value: str,
        }))}
      />
      <Box>from now</Box>
    </HStack>
  );

  // Main render
  return (
    <Box
      {...(selectedEthFormatOption?.value === "Unix Time"
        ? {
            bg: "blackAlpha.600",
            padding: "1rem",
            rounded: "md",
          }
        : {})}
    >
      <InputInfo input={input} />
      <HStack>
        {renderInputField()}
        <DarkSelect
          boxProps={{
            minW: "9rem",
            fontSize: "small",
          }}
          selectedOption={selectedEthFormatOption}
          setSelectedOption={(option) =>
            setSelectedEthFormatOption(option as ETHSelectedOptionState)
          }
          options={ethFormatOptions.map((str) => ({
            label: str,
            value: str,
          }))}
        />
        {selectedEthFormatOption && selectedEthFormatOption.value !== "Wei" && (
          <Button
            p={5}
            size="sm"
            onClick={handleConvertToWei}
            colorScheme={readFunctionIsError ? "yellow" : undefined}
          >
            <Box fontSize="xs">
              {readFunctionIsError && "⚠️"} To{" "}
              {selectedEthFormatOption.value === "Days" ||
              selectedEthFormatOption.value === "Hours" ||
              selectedEthFormatOption.value === "Minutes"
                ? "Seconds"
                : "Wei"}
            </Box>
          </Button>
        )}
      </HStack>
      {selectedEthFormatOption.value === "Unix Time" &&
        renderUnixTimeControls()}
      {isError && (
        <Box w="full" pt={4} my={2} color="red.300" fontSize="sm">
          <Center fontWeight="bold">Error converting:</Center>
          <Center maxW="30rem">{errorMsg}</Center>
        </Box>
      )}
    </Box>
  );
};
