"use client";
import { useEffect, useId, useRef, useState } from "react";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Spinner,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { builtinNetworks } from "@/data/networks";
import {
  fetchRpcChainId,
  parseCustomChain,
  verifyCustomChain,
  type CustomChain,
} from "@/lib/customChains/model";
import {
  initializeCustomChains,
  removeCustomChain,
  saveCustomChain,
  useCustomChains,
} from "@/lib/customChains/store";

type Draft = {
  name: string;
  rpcUrl: string;
  id: string;
  symbol: string;
  decimals: string;
  explorerUrl: string;
};
const empty: Draft = {
  name: "",
  rpcUrl: "",
  id: "",
  symbol: "ETH",
  decimals: "18",
  explorerUrl: "",
};
export function CustomChainModal({
  isOpen,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (chain: CustomChain) => void;
}) {
  const saved = useCustomChains();
  const [draft, setDraft] = useState<Draft>(empty);
  const [editing, setEditing] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const lookup = useRef<AbortController | null>(null);
  const cancelLookup = () => {
    lookup.current?.abort();
    setDetecting(false);
  };
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const prefix = useId();
  const firstInput = useRef<HTMLInputElement>(null!);
  useEffect(() => {
    if (isOpen) {
      setDetecting(false);
      setDraft(empty);
      setEditing(null);
      setConfirmed(false);
      setError("");
      void initializeCustomChains();
    }
    return () => {
      request.current?.abort();
      lookup.current?.abort();
    };
  }, [isOpen]);
  const existing = builtinNetworks[Number(draft.id)];
  const previous = saved.chains.find((chain) => chain.id === Number(draft.id));
  const requiresConfirmation =
    !!existing || (!!previous && editing !== previous.id);
  const change = (field: keyof Draft, value: string) => {
    if (field === "rpcUrl" || field === "id") cancelLookup();
    setDraft((current) => ({ ...current, [field]: value }));
    setError("");
    if (field === "rpcUrl" || field === "id") setConfirmed(false);
  };
  const detectChainId = async (rpcUrl: string) => {
    cancelLookup();
    const controller = new AbortController();
    lookup.current = controller;
    setDetecting(true);
    try {
      const id = await fetchRpcChainId(rpcUrl, controller.signal);
      if (controller.signal.aborted) return;
      if (editing !== null && id !== editing)
        throw new Error(`This RPC reports chain ID ${id}, not ${editing}.`);
      setDraft((current) => ({ ...current, id: String(id) }));
      setConfirmed(false);
    } catch (failure) {
      if (!controller.signal.aborted)
        setError(
          failure instanceof Error
            ? failure.message
            : "Unable to fetch chain ID."
        );
    } finally {
      if (!controller.signal.aborted) setDetecting(false);
    }
  };
  const edit = (chain: CustomChain) => {
    cancelLookup();
    setEditing(chain.id);
    setDraft({
      ...chain,
      id: String(chain.id),
      decimals: String(chain.decimals),
      explorerUrl: chain.explorerUrl ?? "",
    });
    setConfirmed(false);
    setError("");
  };
  const submit = async () => {
    cancelLookup();
    setError("");
    const controller = new AbortController();
    request.current = controller;
    try {
      if (requiresConfirmation && !confirmed)
        throw new Error("Confirm the RPC override before saving.");
      if (saved.error) throw new Error(saved.error);
      const entry = parseCustomChain({
        ...draft,
        id: Number(draft.id),
        decimals: Number(draft.decimals),
        testnet: previous?.testnet ?? existing?.testnet ?? false,
      });
      setBusy(true);
      await verifyCustomChain(entry, controller.signal);
      if (controller.signal.aborted) return;
      await saveCustomChain(entry);
      if (controller.signal.aborted) return;
      onSaved(entry);
      onClose();
    } catch (failure) {
      if (!controller.signal.aborted)
        setError(
          failure instanceof Error
            ? failure.message
            : "Unable to save this chain."
        );
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  };
  const close = () => {
    cancelLookup();
    request.current?.abort();
    setBusy(false);
    onClose();
  };
  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      size="xl"
      isCentered
      initialFocusRef={firstInput}
      blockScrollOnMount={false}
      returnFocusOnClose={false}
    >
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent
        bg="bg.subtle"
        border="1px solid"
        borderColor="border.default"
        rounded="xl"
        mx={4}
        maxH="calc(100dvh - 3rem)"
        as="form"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void submit();
        }}
      >
        <ModalHeader pb={3} pr={12}>
          <HStack spacing={3}>
            <Text>{editing === null ? "Add chain" : "Edit chain"}</Text>
            <Link
              href="https://chainlist.org"
              isExternal
              display="inline-flex"
              alignItems="center"
              gap={1}
              fontSize="sm"
              fontWeight="normal"
              color="blue.400"
            >
              Chainlist <ExternalLink size={13} />
            </Link>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody overflowY="auto" pb={5}>
          <VStack align="stretch" spacing={4}>
            {saved.chains.length > 0 && (
              <Box borderBottom="1px solid" borderColor="border.default" pb={4}>
                <HStack justify="space-between" mb={2}>
                  <Text fontSize="xs" color="text.secondary">
                    Saved networks
                  </Text>
                  {editing !== null && (
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      leftIcon={<Plus size={12} />}
                      onClick={() => {
                        cancelLookup();
                        setEditing(null);
                        setDraft(empty);
                        setConfirmed(false);
                        setError("");
                      }}
                    >
                      New chain
                    </Button>
                  )}
                </HStack>
                <VStack
                  align="stretch"
                  spacing={1}
                  maxH="140px"
                  overflowY="auto"
                >
                  {saved.chains.map((chain) => (
                    <HStack key={chain.id} py={1} spacing={2}>
                      <Box flex={1} minW={0}>
                        <Text fontSize="sm" noOfLines={1}>
                          {chain.name}
                        </Text>
                        <Text fontSize="xs" color="text.tertiary">
                          Chain ID {chain.id}
                        </Text>
                      </Box>
                      <IconButton
                        type="button"
                        size="xs"
                        variant="ghost"
                        aria-label={`Edit ${chain.name}`}
                        icon={<Pencil size={13} />}
                        isDisabled={busy}
                        onClick={() => edit(chain)}
                      />
                      <IconButton
                        type="button"
                        size="xs"
                        variant="ghost"
                        aria-label={`Remove ${chain.name}`}
                        icon={<Trash2 size={13} />}
                        isDisabled={busy}
                        onClick={async () => {
                          cancelLookup();
                          setBusy(true);
                          setError("");
                          try {
                            await removeCustomChain(chain.id);
                            if (editing === chain.id) {
                              setEditing(null);
                              setDraft(empty);
                              setConfirmed(false);
                            }
                          } catch (failure) {
                            setError(
                              failure instanceof Error
                                ? failure.message
                                : "Unable to remove chain."
                            );
                          } finally {
                            setBusy(false);
                          }
                        }}
                      />
                    </HStack>
                  ))}
                </VStack>
              </Box>
            )}
            <FormControl isRequired>
              <FormLabel htmlFor={`${prefix}-name`} fontSize="sm">
                Network name
              </FormLabel>
              <Input
                id={`${prefix}-name`}
                ref={firstInput}
                value={draft.name}
                onChange={(event) => change("name", event.target.value)}
                placeholder="Local fork"
                isDisabled={busy}
                maxLength={80}
                autoComplete="off"
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel htmlFor={`${prefix}-rpc`} fontSize="sm">
                RPC URL
              </FormLabel>
              <InputGroup>
                <Input
                  id={`${prefix}-rpc`}
                  value={draft.rpcUrl}
                  onChange={(event) => change("rpcUrl", event.target.value)}
                  onPaste={(event) => {
                    const text = event.clipboardData.getData("text").trim();
                    if (!text) return;
                    event.preventDefault();
                    const input = event.currentTarget;
                    const next =
                      input.value.slice(0, input.selectionStart ?? 0) +
                      text +
                      input.value.slice(
                        input.selectionEnd ?? input.value.length
                      );
                    change("rpcUrl", next);
                    void detectChainId(next);
                  }}
                  pr={10}
                  placeholder="http://127.0.0.1:8545"
                  isDisabled={busy}
                  autoComplete="off"
                  spellCheck={false}
                />
                {detecting && (
                  <InputRightElement pointerEvents="none">
                    <Spinner
                      size="sm"
                      color="blue.400"
                      label="Fetching RPC chain ID"
                    />
                  </InputRightElement>
                )}
              </InputGroup>
            </FormControl>
            <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={3}>
              <FormControl isRequired>
                <FormLabel htmlFor={`${prefix}-id`} fontSize="sm">
                  Chain ID
                </FormLabel>
                <InputGroup>
                  <Input
                    id={`${prefix}-id`}
                    type="number"
                    min={1}
                    step={1}
                    value={draft.id}
                    onChange={(event) => change("id", event.target.value)}
                    placeholder="31337"
                    isReadOnly={editing !== null || detecting}
                    isDisabled={busy}
                    pr={detecting ? 10 : undefined}
                  />
                  {detecting && (
                    <InputRightElement pointerEvents="none">
                      <Spinner
                        size="sm"
                        color="blue.400"
                        label="Fetching chain ID"
                      />
                    </InputRightElement>
                  )}
                </InputGroup>
              </FormControl>
              <FormControl isRequired>
                <FormLabel htmlFor={`${prefix}-symbol`} fontSize="sm">
                  Currency symbol
                </FormLabel>
                <Input
                  id={`${prefix}-symbol`}
                  value={draft.symbol}
                  onChange={(event) => change("symbol", event.target.value)}
                  isDisabled={busy}
                  maxLength={16}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel htmlFor={`${prefix}-decimals`} fontSize="sm">
                  Decimals
                </FormLabel>
                <Input
                  id={`${prefix}-decimals`}
                  type="number"
                  min={0}
                  max={255}
                  step={1}
                  value={draft.decimals}
                  onChange={(event) => change("decimals", event.target.value)}
                  isDisabled={busy}
                />
              </FormControl>
            </SimpleGrid>
            <FormControl>
              <FormLabel htmlFor={`${prefix}-explorer`} fontSize="sm">
                Block explorer URL{" "}
                <Text as="span" color="text.tertiary">
                  (optional)
                </Text>
              </FormLabel>
              <Input
                id={`${prefix}-explorer`}
                value={draft.explorerUrl}
                onChange={(event) => change("explorerUrl", event.target.value)}
                placeholder="https://explorer.example"
                isDisabled={busy}
              />
            </FormControl>
            {requiresConfirmation && (
              <Box
                bg={confirmed ? "whiteAlpha.50" : "whiteAlpha.25"}
                border="1px solid"
                borderColor={confirmed ? "blue.500" : "border.default"}
                p={4}
                rounded="lg"
                transition="border-color 0.15s, background 0.15s"
              >
                <Checkbox
                  id={`${prefix}-confirm`}
                  aria-label={`Replace the RPC for ${existing?.name ?? previous?.name} (${draft.id})`}
                  aria-describedby={`${prefix}-override-details`}
                  isChecked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  isDisabled={busy}
                  alignItems="flex-start"
                  w="full"
                  colorScheme="blue"
                  spacing={3}
                  sx={{
                    ".chakra-checkbox__control": {
                      mt: "2px",
                      borderColor: confirmed ? "blue.500" : "whiteAlpha.400",
                    },
                    ".chakra-checkbox__label": { flex: 1, minW: 0 },
                  }}
                >
                  <HStack justify="space-between" align="start" spacing={3}>
                    <Text
                      fontSize="sm"
                      fontWeight="medium"
                      color="text.primary"
                    >
                      Replace the RPC for {existing?.name ?? previous?.name}
                    </Text>
                    <Text
                      as="span"
                      fontSize="xs"
                      fontFamily="mono"
                      color="text.secondary"
                      whiteSpace="nowrap"
                      bg="whiteAlpha.50"
                      rounded="md"
                      px={2}
                      py={0.5}
                    >
                      Chain {draft.id}
                    </Text>
                  </HStack>
                  <Box
                    id={`${prefix}-override-details`}
                    mt={1.5}
                    fontSize="xs"
                    lineHeight="tall"
                    color="text.secondary"
                  >
                    <Text>
                      Applies across tools, with no public RPC fallback.
                    </Text>
                    <Text color="text.tertiary">
                      Remove this saved chain to restore the default RPC.
                    </Text>
                  </Box>
                </Checkbox>
              </Box>
            )}
            {(error || saved.error) && (
              <Alert status="error" rounded="lg" fontSize="sm">
                <AlertIcon />
                {error || saved.error}
              </Alert>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter gap={2} borderTop="1px solid" borderColor="border.default">
          <Button type="button" variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button
            type="submit"
            colorScheme="blue"
            isLoading={busy}
            loadingText="Checking RPC"
            isDisabled={
              detecting ||
              !saved.ready ||
              !!saved.error ||
              (requiresConfirmation && !confirmed)
            }
          >
            {editing === null ? "Verify & add" : "Verify & save"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
