import React, { useState } from "react";
import { InputField } from "../InputField";
import { Textarea, Box, Button, Flex, Stack } from "@chakra-ui/react";
import JsonTextArea from "../JsonTextArea";

interface Params {
  value: any;
}

const StringFormatOptions = ["Formatted JSON", "Original"];

export const StringParam = ({ value }: Params) => {
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  let displayValue = value;
  let isJson = false;

  try {
    const parsedValue = JSON.parse(value);
    displayValue = JSON.stringify(parsedValue, null, 4);
    if (
      displayValue === "null" ||
      !value.trim().startsWith("{") ||
      !value.trim().endsWith("}")
    ) {
      throw new Error("Invalid JSON");
    }
    isJson = true;
  } catch (e) {
    // If parsing fails, keep the original value
  }

  const renderContent = () => {
    return selectedTabIndex === 0 ? (
      <JsonTextArea
        value={displayValue}
        setValue={() => {}}
        placeholder="JSON"
        ariaLabel="json"
        h="100%"
        canResize
        autoMaxWidth
      />
    ) : (
      <InputField value={value} placeholder="" isReadOnly onChange={() => {}} />
    );
  };

  return isJson ? (
    <Stack mt={2} p={4} bg={"whiteAlpha.50"} rounded={"lg"}>
      <Flex justifyContent="flex-end" mb={2}>
        <Button
          size="sm"
          onClick={() => setSelectedTabIndex((prev) => (prev === 0 ? 1 : 0))}
        >
          {StringFormatOptions[selectedTabIndex]}
        </Button>
      </Flex>
      {renderContent()}
    </Stack>
  ) : (
    <InputField value={value} placeholder="" isReadOnly onChange={() => {}} />
  );
};
