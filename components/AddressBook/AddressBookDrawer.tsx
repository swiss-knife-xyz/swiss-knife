"use client";

import React, { useState, useEffect } from "react";
import {
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  VStack,
  HStack,
  Input,
  Button,
  Text,
  Box,
  IconButton,
  useToast,
  InputGroup,
  InputLeftElement,
  Flex,
  Spacer,
} from "@chakra-ui/react";
import { DeleteIcon, EditIcon, CheckIcon, CloseIcon } from "@chakra-ui/icons";
import { Search, Plus, BookOpen } from "lucide-react";
import { isAddress, getAddress } from "viem";
import { useAddressBook } from "@/hooks/useAddressBook";
import { slicedText } from "@/utils";

export function AddressBookDrawer() {
  const {
    addresses,
    isDrawerOpen,
    closeDrawer,
    addAddress,
    removeAddress,
    updateAddress,
    isLoading,
  } = useAddressBook();

  const [newAddress, setNewAddress] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingAddress, setEditingAddress] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const toast = useToast();

  // Reset form when drawer opens
  useEffect(() => {
    if (isDrawerOpen) {
      setNewAddress("");
      setNewLabel("");
      setSearchQuery("");
      setEditingAddress(null);
    }
  }, [isDrawerOpen]);

  const filteredAddresses = addresses.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.address.toLowerCase().includes(query) ||
      item.label.toLowerCase().includes(query)
    );
  });

  const handleAdd = async () => {
    if (!newAddress || !newLabel) {
      toast({
        title: "Missing fields",
        description: "Please enter both address and label",
        status: "warning",
        duration: 3000,
      });
      return;
    }

    // Validate address format
    if (!isAddress(newAddress) && !newAddress.includes(".")) {
      toast({
        title: "Invalid address",
        description: "Please enter a valid Ethereum address or ENS name",
        status: "error",
        duration: 3000,
      });
      return;
    }

    setIsAdding(true);
    try {
      await addAddress(newAddress, newLabel);
      setNewAddress("");
      setNewLabel("");
      toast({
        title: "Address saved",
        status: "success",
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: "Failed to save",
        description: error instanceof Error ? error.message : "Unknown error",
        status: "error",
        duration: 3000,
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (address: string) => {
    try {
      await removeAddress(address);
      toast({
        title: "Address removed",
        status: "success",
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: "Failed to remove",
        description: error instanceof Error ? error.message : "Unknown error",
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleEdit = (address: string, currentLabel: string) => {
    setEditingAddress(address);
    setEditLabel(currentLabel);
  };

  const handleSaveEdit = async () => {
    if (!editingAddress || !editLabel) return;

    try {
      await updateAddress(editingAddress, editLabel);
      setEditingAddress(null);
      setEditLabel("");
      toast({
        title: "Label updated",
        status: "success",
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: "Failed to update",
        description: error instanceof Error ? error.message : "Unknown error",
        status: "error",
        duration: 3000,
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingAddress(null);
    setEditLabel("");
  };

  return (
    <Drawer isOpen={isDrawerOpen} placement="right" onClose={closeDrawer} size="md">
      <DrawerOverlay backdropFilter="blur(8px)" bg="blackAlpha.600" />
      <DrawerContent bg="bg.base" borderLeftWidth="1px" borderColor="border.subtle">
        <DrawerCloseButton color="text.secondary" _hover={{ color: "text.primary" }} />
        <DrawerHeader
          borderBottomWidth="1px"
          borderColor="border.subtle"
          color="text.primary"
        >
          <HStack spacing={3}>
            <BookOpen size={20} />
            <Text>Address Book</Text>
          </HStack>
        </DrawerHeader>

        <DrawerBody py={6}>
          <VStack spacing={6} align="stretch">
            {/* Add new address section */}
            <Box
              p={4}
              bg="whiteAlpha.50"
              borderRadius="lg"
              border="1px solid"
              borderColor="whiteAlpha.100"
            >
              <Text fontWeight="medium" color="text.primary" mb={3}>
                Add New Address
              </Text>
              <VStack spacing={3}>
                <Input
                  placeholder="Address (0x...) or ENS name"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
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
                    borderColor: "blue.400",
                    boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
                  }}
                  color="white"
                />
                <Input
                  placeholder="Label (e.g., My Wallet, USDC, etc.)"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
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
                <Button
                  leftIcon={<Plus size={16} />}
                  colorScheme="blue"
                  w="full"
                  onClick={handleAdd}
                  isLoading={isAdding}
                  isDisabled={!newAddress || !newLabel}
                >
                  Save Address
                </Button>
              </VStack>
            </Box>

            {/* Search section */}
            {addresses.length > 0 && (
              <InputGroup>
                <InputLeftElement pointerEvents="none">
                  <Search size={16} color="gray" />
                </InputLeftElement>
                <Input
                  placeholder="Search addresses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
            <VStack spacing={3} align="stretch">
              {isLoading ? (
                <Text color="text.secondary" textAlign="center" py={4}>
                  Loading...
                </Text>
              ) : filteredAddresses.length === 0 ? (
                <Text color="text.secondary" textAlign="center" py={4}>
                  {addresses.length === 0
                    ? "No saved addresses yet"
                    : "No matching addresses"}
                </Text>
              ) : (
                filteredAddresses.map((item) => (
                  <Box
                    key={item.address}
                    p={4}
                    bg="whiteAlpha.50"
                    borderRadius="lg"
                    border="1px solid"
                    borderColor="whiteAlpha.100"
                    _hover={{ borderColor: "whiteAlpha.200" }}
                    transition="border-color 0.2s"
                  >
                    {editingAddress === item.address ? (
                      <VStack spacing={2} align="stretch">
                        <Input
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          size="sm"
                          autoFocus
                          bg="whiteAlpha.100"
                          border="1px solid"
                          borderColor="blue.400"
                        />
                        <HStack justify="flex-end">
                          <IconButton
                            aria-label="Cancel edit"
                            icon={<CloseIcon />}
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEdit}
                          />
                          <IconButton
                            aria-label="Save edit"
                            icon={<CheckIcon />}
                            size="sm"
                            colorScheme="green"
                            onClick={handleSaveEdit}
                          />
                        </HStack>
                      </VStack>
                    ) : (
                      <>
                        <Flex align="center" mb={2}>
                          <Text
                            fontWeight="semibold"
                            color="text.primary"
                            fontSize="sm"
                          >
                            {item.label}
                          </Text>
                          <Spacer />
                          <HStack spacing={1}>
                            <IconButton
                              aria-label="Edit label"
                              icon={<EditIcon />}
                              size="xs"
                              variant="ghost"
                              color="text.secondary"
                              _hover={{ color: "text.primary" }}
                              onClick={() => handleEdit(item.address, item.label)}
                            />
                            <IconButton
                              aria-label="Delete address"
                              icon={<DeleteIcon />}
                              size="xs"
                              variant="ghost"
                              color="text.secondary"
                              _hover={{ color: "red.400" }}
                              onClick={() => handleDelete(item.address)}
                            />
                          </HStack>
                        </Flex>
                        <Text
                          fontSize="xs"
                          color="text.secondary"
                          fontFamily="mono"
                          wordBreak="break-all"
                        >
                          {item.address.includes(".")
                            ? item.address
                            : slicedText(item.address)}
                        </Text>
                      </>
                    )}
                  </Box>
                ))
              )}
            </VStack>
          </VStack>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
