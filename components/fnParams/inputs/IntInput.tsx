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
import { motion, AnimatePresence } from "framer-motion";

// Types and Interfaces
interface IntInputProps extends InputProps {
  input: JsonFragment;
  value?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readFunctionIsError?: boolean;
}

const futureTimeOptions = ["minutes", "hours", "days"] as const;
type FutureTimeOption = (typeof futureTimeOptions)[number];
interface SelectedFutureTimeOptionState {
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
  const [isAnimating, setIsAnimating] = useState(false);
  const [delayedAnimating, setDelayedAnimating] = useState(isAnimating);
  const animationDuration = 300;
  const delayedAnimationDuration = 10;
  const [isError, setIsError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // time state
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
      setIsAnimating(true);
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
      setTimeout(() => setIsAnimating(false), animationDuration);
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
    setIsAnimating(true);
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
    setTimeout(() => setIsAnimating(false), animationDuration);
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

  useEffect(() => {
    if (!isAnimating) {
      const timer = setTimeout(() => {
        setDelayedAnimating(false);
      }, delayedAnimationDuration);
      return () => clearTimeout(timer);
    } else {
      setDelayedAnimating(true);
    }
  }, [isAnimating]);

  // Render helpers
  const renderInputField = () => (
    <Box position="relative" width="100%">
      <motion.div
        initial={false}
        animate={{
          opacity: isAnimating ? 1 : 0,
        }}
        transition={{
          opacity: { duration: 0.3 },
        }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: "md",
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        <motion.div
          initial={false}
          animate={{
            x: isAnimating ? ["-100%", "0%"] : "0%",
          }}
          transition={{
            x: {
              duration: 0.3,
              repeat: isAnimating ? Infinity : 0,
              repeatType: "loop",
              ease: "linear",
            },
          }}
          style={{
            width: "200%",
            height: "100%",
            backgroundImage:
              "linear-gradient(90deg, #3498db, #8e44ad, #3498db)",
            backgroundSize: "50% 100%",
          }}
        />
      </motion.div>
      <InputField
        InputLeftElement={
          selectedEthFormatOption?.value === "Bps ↔️ %" ? (
            <InputLeftElement bg="whiteAlpha.100">%</InputLeftElement>
          ) : undefined
        }
        pl={selectedEthFormatOption?.value === "Bps ↔️ %" ? "14" : undefined}
        bg="bg.900"
        value={value}
        type={
          selectedEthFormatOption?.value === "Unix Time"
            ? "date-time"
            : "number"
        }
        placeholder=""
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          setIsError(false);
          onChange(e);
        }}
        {...props}
        isInvalid={isError || readFunctionIsError}
        sx={{
          position: "relative",
          zIndex: 1,
        }}
        borderColor="whiteAlpha.300"
        border={delayedAnimating ? "none" : undefined}
      />
      <motion.div
        initial={false}
        animate={{
          boxShadow: isAnimating
            ? "0 0 5px #3498db, 0 0 10px #3498db, 0 0 15px #3498db"
            : "none",
        }}
        transition={{
          boxShadow: {
            duration: 0.2,
            repeat: isAnimating ? Infinity : 0,
            repeatType: "reverse",
            ease: "linear",
          },
        }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: "md",
          pointerEvents: "none",
        }}
      />
    </Box>
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
      <Button
        size="sm"
        onClick={() => {
          setIsAnimating(true);

          onChange({
            target: { value: currentTimestamp.toString() },
          } as any);

          setTimeout(() => setIsAnimating(false), animationDuration);
        }}
      >
        Set Timestamp
      </Button>
      <Box>Current timestamp:</Box>
      <Box color="blue.100">{currentTimestamp}</Box>
    </HStack>
  );

  const renderFutureTimeTab = () => (
    <HStack mt="3">
      <Button
        size="sm"
        onClick={() => {
          setIsAnimating(true);
          handleSetFutureTimestamp();
          setTimeout(() => setIsAnimating(false), animationDuration);
        }}
      >
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
