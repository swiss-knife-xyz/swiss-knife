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
import { motion } from "framer-motion";

// Types and Interfaces
interface IntInputProps extends InputProps {
  input: JsonFragment;
  value?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  functionIsError?: boolean;
  isArrayChild?: boolean;
  setFunctionIsDisabled: (value: boolean) => void;
  defaultEthFormatIndex?: number;
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
  functionIsError,
  isInvalid,
  isArrayChild,
  setFunctionIsDisabled,
  defaultEthFormatIndex,
  ...props
}: IntInputProps) => {
  // Refs
  const prevValueRef = useRef<string>("0");
  const buttonClickedRef = useRef<boolean>(false);

  // State
  const [displayValue, setDisplayValue] = useState<string>("");
  const [internalValue, setInternalValue] = useState<string>(value || "");
  const [selectedEthFormatOption, setSelectedEthFormatOption] =
    useState<ETHSelectedOptionState>({
      label: ethFormatOptions[defaultEthFormatIndex || 0],
      value: ethFormatOptions[defaultEthFormatIndex || 0],
    });
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDelayedAnimating, setIsDelayedAnimating] = useState(isAnimating);
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

  // Add new effect to handle initial value
  useEffect(() => {
    if (value) {
      handleValueUpdate(value, selectedEthFormatOption);
    }
  }, []);

  // Add new effect to sync value changes from parent
  useEffect(() => {
    if (value !== internalValue) {
      handleValueUpdate(value || "", selectedEthFormatOption);
    }
  }, [value]);

  useEffect(() => {
    handleEthFormatOptionChange();
  }, [selectedEthFormatOption]);

  useEffect(() => {
    handleUnixTimeUpdate();
  }, [selectedEthFormatOption]);

  // useEffect(() => {
  //   if (selectedEthFormatOption.value !== ethFormatOptions[0]) {
  //     setFunctionIsDisabled(true);
  //   } else {
  //     setFunctionIsDisabled(false);
  //   }
  // }, [selectedEthFormatOption]);

  // Handlers
  const handleValueUpdate = (
    newValue: string,
    format: ETHSelectedOptionState
  ) => {
    try {
      // Convert the value to the display format
      if (format.value !== "Wei") {
        const weiAmount = newValue;
        const convertedValue = convertTo(format, weiAmount);

        if (format.value === "Bps ↔️ %") {
          setDisplayValue(convertedValue.slice(0, -1));
        } else if (format.value === "Unix Time") {
          setDisplayValue(
            convertGMTToUnixSeconds(convertedValue.toString()).toString()
          );
        } else {
          setDisplayValue(convertedValue);
        }
      } else {
        setDisplayValue(newValue);
      }
      setInternalValue(newValue);
    } catch (e) {
      console.error("Error converting value:", e);
      setDisplayValue(newValue);
      setInternalValue(newValue);
    }
  };

  const handleEthFormatOptionChange = () => {
    if (buttonClickedRef.current) {
      buttonClickedRef.current = false;
      prevValueRef.current = selectedEthFormatOption?.value?.toString() ?? "0";
      return;
    }

    if (
      selectedEthFormatOption &&
      prevValueRef.current !== selectedEthFormatOption.value &&
      prevValueRef.current !== "0"
    ) {
      setIsAnimating(true);
      try {
        // Convert current display value back to Wei
        const weiAmount = convertFrom(
          {
            label: prevValueRef.current as EthFormatOption,
            value: prevValueRef.current as EthFormatOption,
          },
          displayValue
        );

        // Convert Wei to new format for display
        const newDisplayValue = convertTo(selectedEthFormatOption, weiAmount);

        if (selectedEthFormatOption.value === "Bps ↔️ %") {
          setDisplayValue(newDisplayValue.slice(0, -1));
        } else if (selectedEthFormatOption.value === "Unix Time") {
          setDisplayValue(
            convertGMTToUnixSeconds(newDisplayValue.toString()).toString()
          );
        } else {
          setDisplayValue(newDisplayValue);
        }

        // Update the internal value
        onChange({ target: { value: weiAmount } } as any);
        setInternalValue(weiAmount);
      } catch (e) {
        setIsError(true);
        setErrorMsg(getErrorMessage(e));
      }
      setTimeout(() => setIsAnimating(false), animationDuration);
    }
    prevValueRef.current = selectedEthFormatOption?.value?.toString() ?? "0";
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDisplayValue = e.target.value;
    setDisplayValue(newDisplayValue);
    setIsError(false);

    try {
      // Convert display value to Wei
      const weiValue = convertFrom(selectedEthFormatOption, newDisplayValue);
      setInternalValue(weiValue);
      onChange({ target: { value: weiValue } } as any);
    } catch (e) {
      setIsError(true);
      setErrorMsg(getErrorMessage(e));
    }
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
        setIsDelayedAnimating(false);
      }, delayedAnimationDuration);
      return () => clearTimeout(timer);
    } else {
      setIsDelayedAnimating(true);
    }
  }, [isAnimating]);

  // Render helpers
  const renderInputField = () => (
    <Box position="relative" width="100%">
      <motion.div
        initial={false}
        animate={{
          opacity: isDelayedAnimating ? 1 : 0,
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
            x: isDelayedAnimating ? ["-100%", "0%"] : "0%",
          }}
          transition={{
            x: {
              duration: 0.3,
              repeat: isDelayedAnimating ? Infinity : 0,
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
        bg={isDelayedAnimating ? "bg.900" : undefined}
        value={displayValue}
        type={
          selectedEthFormatOption?.value === "Unix Time" ? "date-time" : "text"
        }
        placeholder=""
        onChange={handleInputChange}
        onWheel={() => {}}
        {...props}
        isInvalid={isInvalid || isError || isNaN(Number(displayValue))}
        sx={{
          position: "relative",
          zIndex: 1,
        }}
      />
      <motion.div
        initial={false}
        animate={{
          boxShadow: isDelayedAnimating
            ? "0 0 5px #3498db, 0 0 10px #3498db, 0 0 15px #3498db"
            : "none",
        }}
        transition={{
          boxShadow: {
            duration: 0.2,
            repeat: isDelayedAnimating ? Infinity : 0,
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
        onWheel={(e) => e.preventDefault()}
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
        {/* {selectedEthFormatOption && selectedEthFormatOption.value !== "Wei" && (
          <Button
            p={5}
            size="sm"
            onClick={handleConvertToWei}
            colorScheme={"yellow"}
          >
            <Box fontSize="xs">
              {"⚠️"} To{" "}
              {selectedEthFormatOption.value === "Days" ||
              selectedEthFormatOption.value === "Hours" ||
              selectedEthFormatOption.value === "Minutes"
                ? "Seconds"
                : "Wei"}
            </Box>
          </Button>
        )} */}
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
