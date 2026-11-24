"use client";

import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  VStack,
  HStack,
  Input,
  Button,
  Text,
  IconButton,
  Tooltip,
  useToast,
  InputGroup,
  InputLeftElement,
} from "@chakra-ui/react";
import { Search, BookOpen, Pencil, Trash2 } from "lucide-react";
import { useAddressBookSelectorContext } from "@/contexts/AddressBookContext";
import { slicedText } from "@/utils";
import { AddressLabelModal } from "./AddressLabelModal";
import { useAddressBook } from "@/hooks/useAddressBook";
import { SavedAddressInfo } from "@/types/addressBook";

export function AddressBookSelector() {
  const {
    addresses,
    isSelectorOpen,
    closeSelector,
    onAddressSelect,
    isLoading,
    defaultAddress,
  } = useAddressBookSelectorContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddressInfo | null>(null);
  const [deletingAddress, setDeletingAddress] = useState<string | null>(null);
  const { removeAddress } = useAddressBook();
  const toast = useToast();

  const handleDelete = async (address: string) => {
    setDeletingAddress(address);
    try {
      await removeAddress(address);
    } catch (error) {
      toast({
        title: "Failed to remove address",
        description: error instanceof Error ? error.message : "Unknown error",
        status: "error",
      });
    } finally {
      setDeletingAddress(null);
    }
  };

  // Reset search when modal opens
  useEffect(() => {
    if (isSelectorOpen) {
      setSearchQuery("");
    }
  }, [isSelectorOpen]);

  const filteredAddresses = addresses.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.address.toLowerCase().includes(query) ||
      item.label.toLowerCase().includes(query)
    );
  });

  const handleSelect = (address: string) => {
    if (onAddressSelect) {
      onAddressSelect(address);
    }
    closeSelector();
  };

  return (
    <>
    <Modal isOpen={isSelectorOpen && !isAddingAddress && !editingAddress} onClose={closeSelector} isCentered size="md">
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(8px)" />
      <ModalContent bg="bg.base" border="1px solid" borderColor="border.subtle">
        <ModalHeader color="text.primary">
          <HStack spacing={3}>
            <BookOpen size={20} />
            <Text>Select from Address Book</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton color="text.secondary" _hover={{ color: "text.primary" }} />

        <ModalBody pb={6}>
          <VStack spacing={4} align="stretch">
            {/* Search */}
            {addresses.length > 3 && (
              <InputGroup>
                <InputLeftElement pointerEvents="none">
                  <Search size={16} color="gray" />
                </InputLeftElement>
                <Input
                  placeholder="Search addresses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  bg="whiteAlpha.50"
                  border="1px solid"
                  borderColor="whiteAlpha.200"
                  _hover={{ borderColor: "whiteAlpha.300" }}
                  _focus={{
                    borderColor: "blue.400",
                    boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
                  }}
                  color="white"
                />
              </InputGroup>
            )}

            {/* Address list */}
            <VStack spacing={2} align="stretch" maxH="300px" overflowY="auto">
              {isLoading ? (
                <Text color="text.secondary" textAlign="center" py={4}>
                  Loading...
                </Text>
              ) : filteredAddresses.length === 0 ? (
                <Text color="text.secondary" textAlign="center" py={4}>
                  {addresses.length === 0
                    ? "No saved addresses"
                    : "No matching addresses"}
                </Text>
              ) : (
                filteredAddresses.map((item) => (
                  <HStack key={item.address} spacing={0} bg="whiteAlpha.50" rounded="md" minW={0} pr={1}>
                  <Button
                    onClick={() => handleSelect(item.address)}
                    variant="ghost"
                    justifyContent="flex-start"
                    h="auto"
                    py={3}
                    px={3}
                    flex={1}
                    minW={0}
                    bg="transparent"
                    _hover={{ bg: "whiteAlpha.100" }}
                    border="1px solid"
                    borderColor="transparent"
                  >
                    <VStack align="start" spacing={0} w="full" minW={0}>
                      <Text
                        fontWeight="semibold"
                        color="text.primary"
                        fontSize="sm"
                        maxW="full"
                        isTruncated
                      >
                        {item.label}
                      </Text>
                      <Text
                        fontSize="xs"
                        color="text.secondary"
                        fontFamily="mono"
                        maxW="full"
                        isTruncated
                      >
                        {item.address.includes(".")
                          ? item.address
                          : slicedText(item.address)}
                      </Text>
                    </VStack>
                  </Button>
                  <Tooltip label="Edit label" hasArrow>
                    <IconButton
                      aria-label={`Edit ${item.label}`}
                      icon={<Pencil size={16} />}
                      variant="ghost" size="sm" flexShrink={0}
                      color="text.secondary"
                      onClick={() => setEditingAddress(item)}
                    />
                  </Tooltip>
                  <Tooltip label="Delete address" hasArrow>
                    <IconButton
                      aria-label={`Delete ${item.label}`}
                      icon={<Trash2 size={16} />}
                      variant="ghost" size="sm" flexShrink={0}
                      color="text.secondary"
                      _hover={{ color: "red.300", bg: "whiteAlpha.100" }}
                      isLoading={deletingAddress === item.address}
                      isDisabled={deletingAddress !== null}
                      onClick={() => handleDelete(item.address)}
                    />
                  </Tooltip>
                  </HStack>
                ))
              )}
            </VStack>
            <Button onClick={() => setIsAddingAddress(true)} alignSelf="center">
              Add to Book
            </Button>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
    <AddressLabelModal
      isOpen={isSelectorOpen && (isAddingAddress || editingAddress !== null)}
      address={editingAddress?.address}
      defaultAddress={defaultAddress}
      existingLabel={editingAddress?.label}
      onClose={() => {
        setIsAddingAddress(false);
        setEditingAddress(null);
      }}
    />
    </>
  );
}
