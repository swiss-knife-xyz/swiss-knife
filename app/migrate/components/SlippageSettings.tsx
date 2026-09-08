"use client";

import { useRef, useState } from "react";
import {
  HStack,
  Text,
  Input,
  Flex,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  VStack,
  useDisclosure,
} from "@chakra-ui/react";
import { Settings2 } from "lucide-react";

export const SLIPPAGE_PRESETS_BPS = [50, 100, 300]; // 0.5%, 1%, 3%

interface SlippageSettingsProps {
  slippageBps: number;
  onSlippageChange: (bps: number) => void;
}

export function SlippageSettings({
  slippageBps,
  onSlippageChange,
}: SlippageSettingsProps) {
  const { isOpen, onToggle, onClose } = useDisclosure();
  const [customValue, setCustomValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null!);

  const isPreset = SLIPPAGE_PRESETS_BPS.includes(slippageBps);
  const displayPercent = (slippageBps / 100).toFixed(
    slippageBps % 100 === 0 ? 0 : 1
  );

  const handlePreset = (bps: number) => {
    onSlippageChange(bps);
    setCustomValue("");
    onClose();
  };

  const handleCustom = (val: string) => {
    if (val === "" || /^\d*\.?\d*$/.test(val)) {
      setCustomValue(val);
      const num = parseFloat(val);
      if (!isNaN(num) && num > 0 && num <= 50) {
        onSlippageChange(Math.round(num * 100));
      }
    }
  };

  return (
    <Popover
      isOpen={isOpen}
      onClose={onClose}
      placement="bottom-end"
      initialFocusRef={inputRef}
    >
      <PopoverTrigger>
        <HStack
          as="button"
          spacing={1.5}
          onClick={onToggle}
          cursor="pointer"
          px={2}
          py={1}
          borderRadius="md"
          bg="whiteAlpha.100"
          border="1px solid"
          borderColor="whiteAlpha.200"
          _hover={{ borderColor: "whiteAlpha.300", bg: "whiteAlpha.200" }}
        >
          <Settings2 size={12} color="var(--chakra-colors-whiteAlpha-700)" />
          <Text fontSize="2xs" fontWeight="600" color="whiteAlpha.800">
            {displayPercent}% slippage
          </Text>
        </HStack>
      </PopoverTrigger>
      <PopoverContent
        w="220px"
        bg="bg.muted"
        border="1px solid"
        borderColor="whiteAlpha.300"
        boxShadow="0 12px 40px rgba(0,0,0,0.5)"
      >
        <PopoverBody p={3}>
          <VStack spacing={2} align="stretch">
            <Text
              fontSize="2xs"
              color="whiteAlpha.600"
              letterSpacing="wider"
              textTransform="uppercase"
            >
              Slippage tolerance
            </Text>
            <HStack spacing={1}>
              {SLIPPAGE_PRESETS_BPS.map((bps) => {
                const pct = bps / 100;
                const isActive = slippageBps === bps;
                return (
                  <Flex
                    key={bps}
                    as="button"
                    flex={1}
                    justify="center"
                    py={1.5}
                    bg={isActive ? "primary.500" : "whiteAlpha.100"}
                    color={isActive ? "white" : "whiteAlpha.800"}
                    fontWeight="600"
                    fontSize="xs"
                    border="1px solid"
                    borderColor={isActive ? "primary.500" : "whiteAlpha.200"}
                    borderRadius="md"
                    _hover={{
                      bg: isActive ? "primary.600" : "whiteAlpha.200",
                    }}
                    onClick={() => handlePreset(bps)}
                  >
                    {pct}%
                  </Flex>
                );
              })}
            </HStack>

            <HStack
              border="1px solid"
              borderColor={
                !isPreset && slippageBps > 0
                  ? "primary.500"
                  : "whiteAlpha.200"
              }
              bg="whiteAlpha.50"
              borderRadius="md"
              px={2}
              py={1}
              spacing={1}
            >
              <Input
                ref={inputRef}
                placeholder="Custom"
                value={customValue || (slippageBps / 100).toString()}
                onChange={(e) => handleCustom(e.target.value)}
                bg="transparent"
                border="none"
                _hover={{ bg: "transparent" }}
                _focus={{ bg: "transparent", boxShadow: "none" }}
                _placeholder={{ color: "whiteAlpha.500" }}
                fontSize="xs"
                fontWeight="600"
                color="white"
                p={0}
                h="auto"
                flex={1}
              />
              <Text fontSize="xs" fontWeight="600" color="whiteAlpha.600">
                %
              </Text>
            </HStack>

            {slippageBps > 1000 && (
              <Text fontSize="2xs" color="#F87171" fontWeight="600">
                High slippage — front-run risk
              </Text>
            )}
          </VStack>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}
