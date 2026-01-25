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
  Box,
  InputGroup,
  InputLeftElement,
} from "@chakra-ui/react";
import { Search, BookOpen } from "lucide-react";
import { useAddressBook } from "@/hooks/useAddressBook";
import { slicedText } from "@/utils";

export function AddressBookSelector() {
  const {
    addresses,
    isSelectorOpen,
    closeSelector,
    onAddressSelect,
    isLoading,
  } = useAddressBook();

  const [searchQuery, setSearchQuery] = useState("");

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
    <Modal isOpen={isSelectorOpen} onClose={closeSelector} isCentered size="md">
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(8px)" />
      <ModalContent bg="bg.base" border="1px solid" borderColor="border.subtle">
        <ModalHeader color="text.primary">
          <HStack spacing={3}>
            <BookOpen size={20} />
            <Text>Select Address</Text>
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
                  <Button
                    key={item.address}
                    onClick={() => handleSelect(item.address)}
                    variant="ghost"
                    justifyContent="flex-start"
                    h="auto"
                    py={3}
                    px={4}
                    bg="whiteAlpha.50"
                    _hover={{ bg: "whiteAlpha.100" }}
                    border="1px solid"
                    borderColor="transparent"
                  >
                    <VStack align="start" spacing={0} w="full">
                      <Text
                        fontWeight="semibold"
                        color="text.primary"
                        fontSize="sm"
                      >
                        {item.label}
                      </Text>
                      <Text
                        fontSize="xs"
                        color="text.secondary"
                        fontFamily="mono"
                      >
                        {item.address.includes(".")
                          ? item.address
                          : slicedText(item.address)}
                      </Text>
                    </VStack>
                  </Button>
                ))
              )}
            </VStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
