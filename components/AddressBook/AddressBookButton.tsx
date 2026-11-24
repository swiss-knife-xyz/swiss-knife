"use client";

import React from "react";
import { IconButton, Tooltip } from "@chakra-ui/react";
import { BookOpen } from "lucide-react";
import { useAddressBook } from "@/hooks/useAddressBook";

interface AddressBookButtonProps {
  onSelect: (address: string) => void;
  isDisabled?: boolean;
  onOpen?: () => void;
}

export function AddressBookButton({ onSelect, isDisabled, onOpen }: AddressBookButtonProps) {
  const { openSelector } = useAddressBook();

  return (
    <Tooltip label="Select from Address Book" placement="top">
      <IconButton
        aria-label="Select from Address Book"
        onClick={() => {
          onOpen?.();
          openSelector(onSelect);
        }}
        isDisabled={isDisabled}
        size="xs"
        fontWeight="thin"
        variant="ghost"
        color="whiteAlpha.300"
        _hover={{ color: "whiteAlpha.600" }}
        icon={<BookOpen size={12} />}
      />
    </Tooltip>
  );
}
