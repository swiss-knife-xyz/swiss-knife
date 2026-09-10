"use client";

import React from "react";
import { Button, Tooltip } from "@chakra-ui/react";
import { BookOpen } from "lucide-react";
import { useAddressBook } from "@/hooks/useAddressBook";

interface AddressBookButtonProps {
  onSelect: (address: string) => void;
}

export function AddressBookButton({ onSelect }: AddressBookButtonProps) {
  const { openSelector, addresses } = useAddressBook();

  if (addresses.length === 0) {
    return null;
  }

  return (
    <Tooltip label="Select from Address Book" placement="top">
      <Button
        onClick={() => openSelector(onSelect)}
        size="xs"
        fontWeight="thin"
        variant="ghost"
        color="whiteAlpha.300"
        _hover={{ color: "whiteAlpha.600" }}
        leftIcon={<BookOpen size={12} />}
      >
        [book]
      </Button>
    </Tooltip>
  );
}
