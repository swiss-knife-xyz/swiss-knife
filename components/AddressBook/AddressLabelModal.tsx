"use client";

import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  VStack,
  HStack,
  Input,
  Button,
  Text,
  useToast,
  Spacer,
} from "@chakra-ui/react";
import { DeleteIcon } from "@chakra-ui/icons";
import { BookOpen } from "lucide-react";
import { useAddressBook } from "@/hooks/useAddressBook";
import { slicedText } from "@/utils";

interface AddressLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
  existingLabel?: string | null;
  defaultLabel?: string;
}

export function AddressLabelModal({
  isOpen,
  onClose,
  address,
  existingLabel,
  defaultLabel = "",
}: AddressLabelModalProps) {
  const { addAddress, updateAddress, removeAddress } = useAddressBook();
  const [label, setLabel] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const toast = useToast();

  const isEditing = !!existingLabel;

  // Reset label when modal opens
  useEffect(() => {
    if (isOpen) {
      setLabel(existingLabel || defaultLabel);
    }
  }, [isOpen, existingLabel, defaultLabel]);

  const handleSave = async () => {
    if (!label.trim()) {
      toast({
        title: "Label required",
        description: "Please enter a label for this address",
        status: "warning",
        duration: 3000,
      });
      return;
    }

    setIsSaving(true);
    try {
      if (isEditing) {
        await updateAddress(address, label.trim());
        toast({
          title: "Label updated",
          status: "success",
          duration: 2000,
        });
      } else {
        await addAddress(address, label.trim());
        toast({
          title: "Address saved",
          status: "success",
          duration: 2000,
        });
      }
      onClose();
    } catch (error) {
      toast({
        title: isEditing ? "Failed to update" : "Failed to save",
        description: error instanceof Error ? error.message : "Unknown error",
        status: "error",
        duration: 3000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await removeAddress(address);
      toast({
        title: "Address removed",
        status: "success",
        duration: 2000,
      });
      onClose();
    } catch (error) {
      toast({
        title: "Failed to remove",
        description: error instanceof Error ? error.message : "Unknown error",
        status: "error",
        duration: 3000,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && label.trim()) {
      handleSave();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isCentered
      size="md"
      blockScrollOnMount={false}
      returnFocusOnClose={false}
    >
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(8px)" />
      <ModalContent bg="bg.base" border="1px solid" borderColor="border.subtle">
        <ModalHeader color="text.primary">
          <HStack spacing={3}>
            <BookOpen size={20} />
            <Text>{isEditing ? "Edit Label" : "Save to Address Book"}</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton color="text.secondary" _hover={{ color: "text.primary" }} />

        <ModalBody>
          <VStack spacing={4} align="stretch">
            <VStack align="stretch" spacing={1}>
              <Text fontSize="sm" color="text.secondary">
                Address
              </Text>
              <Text
                fontSize="sm"
                fontFamily="mono"
                color="text.primary"
                bg="whiteAlpha.100"
                p={2}
                rounded="md"
                wordBreak="break-all"
              >
                {address.length > 20 ? slicedText(address) : address}
              </Text>
            </VStack>

            <VStack align="stretch" spacing={1}>
              <Text fontSize="sm" color="text.secondary">
                Label
              </Text>
              <Input
                placeholder="e.g., My Wallet, USDC Contract, Vitalik..."
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-1p-ignore
                data-lpignore="true"
                data-form-type="other"
                bg="whiteAlpha.50"
                border="1px solid"
                borderColor="whiteAlpha.200"
                _hover={{ borderColor: "whiteAlpha.300" }}
                _focus={{
                  borderColor: "purple.400",
                  boxShadow: "0 0 0 1px var(--chakra-colors-purple-400)",
                }}
                color="white"
              />
            </VStack>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3} w="full">
            {isEditing && (
              <Button
                variant="ghost"
                colorScheme="red"
                leftIcon={<DeleteIcon />}
                onClick={handleDelete}
                isLoading={isDeleting}
              >
                Delete
              </Button>
            )}
            <Spacer />
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              onClick={handleSave}
              isLoading={isSaving}
              isDisabled={!label.trim()}
            >
              {isEditing ? "Update" : "Save"}
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
