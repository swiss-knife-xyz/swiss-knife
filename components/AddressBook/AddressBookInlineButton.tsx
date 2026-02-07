"use client";

import React, { useState } from "react";
import { HStack, IconButton, Tag, Tooltip } from "@chakra-ui/react";
import { AddIcon, EditIcon } from "@chakra-ui/icons";
import { BookOpen } from "lucide-react";
import { AddressLabelModal } from "./AddressLabelModal";

interface AddressBookInlineButtonProps {
  address: string;
  existingLabel?: string | null;
  defaultLabel?: string;
  isReady?: boolean;
}

/**
 * Self-contained address book button + modal component.
 * Encapsulates modal state to prevent parent re-renders when opening/closing the modal.
 */
export function AddressBookInlineButton({
  address,
  existingLabel,
  defaultLabel = "",
  isReady = true,
}: AddressBookInlineButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!isReady) return null;

  if (existingLabel) {
    // Show label tag with edit button
    return (
      <>
        <HStack spacing={1}>
          <Tag size="sm" variant="solid" colorScheme="purple" fontSize="xs">
            {existingLabel}
          </Tag>
          <Tooltip label="Edit Label" placement="top">
            <IconButton
              aria-label="Edit label"
              icon={<EditIcon />}
              size="xs"
              variant="ghost"
              color="text.tertiary"
              _hover={{ color: "text.primary", bg: "whiteAlpha.100" }}
              onClick={() => setIsModalOpen(true)}
            />
          </Tooltip>
        </HStack>
        <AddressLabelModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          address={address}
          existingLabel={existingLabel}
          defaultLabel={defaultLabel}
        />
      </>
    );
  }

  // Show add button
  return (
    <>
      <Tooltip label="Save to Address Book" placement="top">
        <IconButton
          aria-label="Save to address book"
          icon={
            <HStack spacing={0.5}>
              <BookOpen size={12} />
              <AddIcon boxSize={2} />
            </HStack>
          }
          size="xs"
          variant="ghost"
          color="text.tertiary"
          _hover={{ color: "text.primary", bg: "whiteAlpha.100" }}
          onClick={() => setIsModalOpen(true)}
        />
      </Tooltip>
      <AddressLabelModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        address={address}
        existingLabel={existingLabel}
        defaultLabel={defaultLabel}
      />
    </>
  );
}
