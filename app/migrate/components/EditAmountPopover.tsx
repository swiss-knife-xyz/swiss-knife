"use client";

import { memo, useEffect, useState } from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverArrow,
  Input,
  InputGroup,
  InputRightElement,
  Button,
  HStack,
  VStack,
  Text,
  IconButton,
  useDisclosure,
} from "@chakra-ui/react";
import { Pencil } from "lucide-react";
import { formatUnits, parseUnits } from "viem";
import { PortfolioToken, getBalanceWei } from "../lib/portfolioApi";

interface EditAmountPopoverProps {
  token: PortfolioToken;
  currentOverrideWei?: bigint;
  onCommit: (wei: bigint | undefined) => void;
  /** Hide the pencil unless hovered/active. Wrapped in `_groupHover` by parent row. */
  alwaysShowPencil?: boolean;
}

function trimZeros(s: string): string {
  if (!s.includes(".")) return s;
  return s.replace(/\.?0+$/, "");
}

function EditAmountPopoverImpl({
  token,
  currentOverrideWei,
  onCommit,
  alwaysShowPencil,
}: EditAmountPopoverProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const fullBalanceWei = getBalanceWei(token);
  const fullBalanceFormatted = formatUnits(fullBalanceWei, token.decimals);
  const initialDisplay =
    currentOverrideWei !== undefined
      ? formatUnits(currentOverrideWei, token.decimals)
      : fullBalanceFormatted;

  const [value, setValue] = useState(initialDisplay);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(initialDisplay);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleApply = () => {
    let parsed: bigint;
    try {
      parsed = parseUnits(value as `${number}`, token.decimals);
    } catch {
      setError("Invalid number");
      return;
    }
    if (parsed < 0n) {
      setError("Must be positive");
      return;
    }
    if (parsed > fullBalanceWei) {
      setError("Greater than balance");
      return;
    }
    // Treat "value == full balance" as clearing the override. Keeps the
    // implicit gas-reserve subtraction working for native tokens; harmless
    // for ERC-20s.
    onCommit(parsed === fullBalanceWei ? undefined : parsed);
    onClose();
  };

  const handleMax = () => {
    setValue(fullBalanceFormatted);
    setError(null);
  };

  return (
    <Popover
      isOpen={isOpen}
      onOpen={onOpen}
      onClose={onClose}
      placement="left"
      closeOnBlur
      returnFocusOnClose={false}
      isLazy
      lazyBehavior="unmount"
    >
      <PopoverTrigger>
        <IconButton
          aria-label={
            currentOverrideWei !== undefined ? "Edit override" : "Edit amount"
          }
          title={
            currentOverrideWei !== undefined ? "Edit override" : "Edit amount"
          }
          icon={<Pencil size={12} />}
          size="xs"
          variant="ghost"
          color="whiteAlpha.700"
          _hover={{ color: "primary.400", bg: "whiteAlpha.100" }}
          opacity={
            alwaysShowPencil || currentOverrideWei !== undefined ? 1 : 0
          }
          _groupHover={{ opacity: 1 }}
          transition="opacity 0.12s ease"
        />
      </PopoverTrigger>
      <PopoverContent
        bg="bg.muted"
        borderColor="whiteAlpha.300"
        color="white"
        width="280px"
        _focus={{ outline: "none" }}
      >
        <PopoverArrow bg="bg.muted" />
        <PopoverBody>
          <VStack align="stretch" spacing={3}>
            <HStack justify="space-between" align="center">
              <Text fontSize="xs" color="whiteAlpha.700">
                Edit{" "}
                <Text as="span" color="white" fontWeight="600">
                  {token.symbol.toUpperCase()}
                </Text>
              </Text>
              <Text fontSize="xs" color="whiteAlpha.600" fontFamily="mono">
                Balance: {trimZeros(fullBalanceFormatted)}
              </Text>
            </HStack>
            <InputGroup size="sm">
              <Input
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleApply();
                }}
                fontFamily="mono"
                bg="whiteAlpha.100"
                borderColor="whiteAlpha.300"
                pr="3.5rem"
                _hover={{ borderColor: "whiteAlpha.400" }}
                _focusVisible={{
                  borderColor: "primary.500",
                  boxShadow: "0 0 0 1px var(--chakra-colors-primary-500)",
                }}
              />
              <InputRightElement width="3.25rem" pr={1}>
                <Button
                  size="xs"
                  variant="ghost"
                  color="primary.400"
                  onClick={handleMax}
                  _hover={{ bg: "whiteAlpha.100" }}
                  fontWeight="600"
                  px={2}
                  h="1.5rem"
                >
                  Max
                </Button>
              </InputRightElement>
            </InputGroup>
            {error && (
              <Text fontSize="xs" color="#F87171">
                {error}
              </Text>
            )}
            <HStack justify="flex-end">
              <Button
                size="sm"
                colorScheme="blue"
                onClick={handleApply}
                bg="primary.500"
                _hover={{ bg: "primary.600" }}
              >
                Apply
              </Button>
            </HStack>
          </VStack>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}

export const EditAmountPopover = memo(EditAmountPopoverImpl);
