"use client";
import { AddressBookButton } from "@/components/AddressBook/AddressBookButton";

import { NetworkSelect } from "@/components/NetworkSelect";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Text,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  SimpleGrid,
  Spinner,
  VStack,
} from "@chakra-ui/react";
import {
  AlignLeft,
  ArrowDownToLine,
  Check,
  Code2,
  FilePenLine,
  ListPlus,
  RotateCcw,
} from "lucide-react";
import { Editor } from "@monaco-editor/react";
import { FunctionFragment, type JsonFragment } from "ethers";
import { networkOptions } from "@/data/common";
import { parseContractExplorerUrl } from "@/lib/contractExplorerInput";
import { compareContractFunctions, parseAdditionalFunctions, parseContractAbi } from "@/lib/contractAbi";
import { fetchContractAbi } from "@/utils";
import type { SelectedOptionState } from "@/types";

const DEFAULT_FUNCTION =
  "function hello(uint256 amount) view returns (address)";

function FunctionDeclarationsEditor({
  value,
  label,
  readOnly = false,
  onChange,
}: {
  value: string;
  label: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <Box h={readOnly ? "180px" : "150px"} overflow="hidden" border="1px solid" borderColor="border.default" borderRadius="md" bg="bg.subtle">
      <Editor
        theme="vs-dark"
        defaultLanguage="sol"
        value={value}
        onChange={onChange ? value => onChange(value ?? "") : undefined}
        height="100%"
        loading={<HStack color="text.tertiary" fontSize="sm" spacing={2}><Spinner size="sm" /><Text>Loading editor…</Text></HStack>}
        options={{
          ariaLabel: label,
          readOnly,
          domReadOnly: readOnly,
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: "var(--font-jetbrains-mono), monospace",
          lineHeight: 21,
          lineNumbersMinChars: 3,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          padding: { top: 10, bottom: 10 },
          wordWrap: "on",
          folding: true,
          renderLineHighlight: "none",
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
        }}
      />
    </Box>
  );
}

export type ContractAbiEditorState = {
  tab: number;
  sourceAddress: string;
  chainId: number;
  importMode: string;
};

type Props = {
  editorState?: ContractAbiEditorState;
  onEditorStateChange?: (state: ContractAbiEditorState) => void;
  abi: JsonFragment[];
  baseAbi?: JsonFragment[];
  functionDeclarations?: string;
  onApplyFunctions?: (abi: JsonFragment[], declarations: string) => void;
  chainId: number;
  isCustom: boolean;
  disabled?: boolean;
  onOpen?: () => void;
  onSubmitted?: () => void;
  onFunctionsAdded?: (functions: JsonFragment[]) => void;
  onApply: (abi: JsonFragment[], merge: boolean) => void;
  onReset: () => void;
};

export function ContractAbiEditor({
  abi,
  editorState,
  onEditorStateChange,
  baseAbi = abi,
  functionDeclarations,
  onApplyFunctions,
  chainId,
  isCustom,
  disabled,
  onOpen,
  onSubmitted,
  onFunctionsAdded,
  onApply,
  onReset,
}: Props) {
  const existingFunctions = useMemo(() => baseAbi
    .filter(entry => entry.type === "function")
    .sort(compareContractFunctions)
    .map(entry => {
      try { return FunctionFragment.from(entry).format("full"); }
      catch { return `// ${entry.name ?? "Unresolved function"}`; }
    }).join("\n"), [baseAbi]);
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const [sessionState, setSessionState] = useState<ContractAbiEditorState>();
  const savedState = editorState ?? sessionState;
  const lastAppliedTab = useRef(0);
  const [replacement, setReplacement] = useState("");
  const [functions, setFunctions] = useState(DEFAULT_FUNCTION);
  const [sourceAddress, setSourceAddress] = useState("");
  const [network, setNetwork] = useState<SelectedOptionState>(null);
  const [importMode, setImportMode] = useState("replace");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const request = useRef(0);
  const addedAfterClose = useRef<JsonFragment[] | null>(null);
  const submittedAfterClose = useRef(false);
  useEffect(
    () => () => {
      request.current++;
    },
    []
  );
  const close = () => {
    const state = {
      tab: lastAppliedTab.current,
      sourceAddress,
      chainId: Number(network?.value ?? chainId),
      importMode,
    };
    setSessionState(state);
    onEditorStateChange?.(state);
    request.current++;
    setLoading(false);
    setIsOpen(false);
  };
  const open = () => {
    addedAfterClose.current = null;
    submittedAfterClose.current = false;
    onOpen?.();
    setReplacement(JSON.stringify(abi, null, 2));
    setFunctions(functionDeclarations ?? DEFAULT_FUNCTION);
    setSourceAddress(savedState?.sourceAddress ?? "");
    setNetwork(
      networkOptions.find((option) => option.value === (savedState?.chainId ?? chainId)) ?? null
    );
    setImportMode(savedState?.importMode ?? "replace");
    lastAppliedTab.current = savedState?.tab ?? 0;
    setTab(lastAppliedTab.current);
    setError("");
    setIsOpen(true);
  };
  const apply = async () => {
    const id = ++request.current;
    setError("");
    try {
      let incoming: JsonFragment[];
      if (tab === 2) {
        const explorer = parseContractExplorerUrl(sourceAddress);
        const address = explorer?.address ?? sourceAddress.trim();
        const sourceChain = explorer?.chainId ?? Number(network?.value);
        if (!/^0x[a-fA-F0-9]{40}$/.test(address))
          throw new Error(
            "Enter a valid source contract address or explorer URL."
          );
        if (!networkOptions.some((option) => option.value === sourceChain))
          throw new Error("Select a source network.");
        setLoading(true);
        const fetched = await fetchContractAbi({
          address,
          chainId: sourceChain,
        });
        if (id !== request.current) return;
        incoming = parseContractAbi(JSON.stringify(fetched.abi));
        if (!incoming.length)
          throw new Error("No ABI definitions found for this contract.");
      } else {
        incoming =
          tab === 0
            ? (!functions.trim() && functionDeclarations !== undefined ? [] : parseAdditionalFunctions(functions))
            : parseContractAbi(replacement);
      }
      if (tab === 0 && onApplyFunctions) onApplyFunctions(incoming, functions);
      else onApply(incoming, tab === 0 || (tab === 2 && importMode === "merge"));
      if (tab === 0) addedAfterClose.current = incoming;
      lastAppliedTab.current = tab;
      submittedAfterClose.current = true;
      close();
    } catch (error) {
      if (id === request.current)
        setError(
          error instanceof Error ? error.message : "Unable to import this ABI."
        );
    } finally {
      if (id === request.current) setLoading(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        color="text.secondary"
        leftIcon={<FilePenLine size={14} />}
        onClick={open}
        isDisabled={disabled}
        position="relative"
        aria-description={isCustom ? "Custom ABI applied" : undefined}
        data-custom-abi={isCustom}
      >
        Modify ABI
        {isCustom && <Box position="absolute" top="-3px" right="2px" boxSize="6px" bg="blue.400" borderRadius="full" aria-hidden="true" />}
      </Button>
      <Modal
        isOpen={isOpen}
        onClose={close}
        onCloseComplete={() => {
          if (submittedAfterClose.current) {
            submittedAfterClose.current = false;
            onSubmitted?.();
          }
          const added = addedAfterClose.current;
          addedAfterClose.current = null;
          if (added) onFunctionsAdded?.(added);
        }}
        isCentered
        size="3xl"
        scrollBehavior="inside"
      >
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(8px)" />
        <ModalContent
          mx={{ base: 3, sm: 6 }}
          my={6}
          maxW="760px"
          h="min(660px, calc(100dvh - 3rem))"
          maxH="calc(100dvh - 3rem)"
          bg="bg.base"
          border="1px solid"
          borderColor="border.default"
          borderRadius="lg"
          overflow="hidden"
        >
          <ModalHeader
            px={{ base: 4, md: 6 }}
            py={5}
            borderBottom="1px solid"
            borderColor="border.subtle"
          >
            <HStack spacing={2.5} color="text.primary">
              <FilePenLine size={18} aria-hidden="true" />
              <Text fontSize="lg" fontWeight="semibold">
                Modify ABI
              </Text>
            </HStack>
            <Text
              mt={1.5}
              pr={6}
              fontSize="sm"
              fontWeight="normal"
              color="text.secondary"
            >
              Edit the interface used by this contract tab.
            </Text>
          </ModalHeader>
          <ModalCloseButton top={4} right={4} size="sm" color="text.tertiary" />
          <ModalBody
            px={{ base: 4, md: 6 }}
            pt={0}
            pb={5}
            flex={1}
            minH={0}
            overflowY="auto"
          >
            <Tabs
              index={tab}
              onChange={(value) => {
                request.current++;
                setLoading(false);
                setTab(value);
                setError("");
              }}
              variant="unstyled"
              isLazy
              lazyBehavior="unmount"
            >
              <TabList
                gap={{ base: 4, md: 6 }}
                borderBottom="1px solid"
                borderColor="border.default"
              >
                {[
                  { label: "Add functions", icon: ListPlus },
                  { label: "ABI", icon: Code2 },
                  { label: "From contract", icon: ArrowDownToLine },
                ].map(({ label, icon: ModeIcon }) => (
                  <Tab
                    key={label}
                    px={0}
                    py={3.5}
                    mb="-1px"
                    fontSize={{ base: "xs", sm: "sm" }}
                    fontWeight="medium"
                    color="text.tertiary"
                    borderBottom="2px solid transparent"
                    _selected={{
                      color: "text.primary",
                      borderColor: "primary.400",
                    }}
                    _hover={{ color: "text.primary" }}
                    _focusVisible={{ boxShadow: "outline" }}
                  >
                    <HStack spacing={2}>
                      <Box
                        as={ModeIcon}
                        boxSize={3.5}
                        display={{ base: "none", sm: "block" }}
                        aria-hidden="true"
                      />
                      <Text as="span" whiteSpace="nowrap">
                        {label}
                      </Text>
                    </HStack>
                  </Tab>
                ))}
              </TabList>
              <TabPanels>
                <TabPanel px={0} pt={5} pb={0}>
                  <FormControl>
                    <FormLabel
                      fontSize="sm"
                      fontWeight="medium"
                      color="text.secondary"
                      mb={3}
                    >
                      Function declarations
                    </FormLabel>
                    <FunctionDeclarationsEditor
                      label="Function declarations"
                      value={functions}
                      onChange={value => {
                        setFunctions(value);
                        setError("");
                      }}
                    />
                  </FormControl>
                  <FormControl mt={5}>
                    <FormLabel fontSize="sm" fontWeight="medium" color="text.secondary" mb={3}>
                      Existing contract functions
                    </FormLabel>
                    <FunctionDeclarationsEditor
                      label="Existing contract functions"
                      value={existingFunctions}
                      readOnly
                    />
                  </FormControl>
                </TabPanel>
                <TabPanel px={0} pt={5} pb={0}>
                  <FormControl>
                    <HStack justify="space-between" mb={3}>
                      <FormLabel
                        mb={0}
                        fontSize="sm"
                        fontWeight="medium"
                        color="text.secondary"
                      >
                        ABI
                      </FormLabel>
                      <Button
                        size="xs"
                        variant="ghost"
                        color="text.secondary"
                        leftIcon={<AlignLeft size={13} />}
                        onClick={() => {
                          try {
                            setReplacement(
                              JSON.stringify(JSON.parse(replacement), null, 2)
                            );
                            setError("");
                          } catch {
                            setError("Enter valid JSON to format this ABI.");
                          }
                        }}
                      >
                        Format JSON
                      </Button>
                    </HStack>
                    <Box
                      h={{ base: "260px", md: "320px" }}
                      maxH="42dvh"
                      minH="180px"
                      overflow="hidden"
                      border="1px solid"
                      borderColor={error ? "red.400" : "border.default"}
                      borderRadius="md"
                      bg="bg.subtle"
                    >
                      <Editor
                        theme="vs-dark"
                        defaultLanguage="json"
                        value={replacement}
                        onChange={(value) => {
                          setReplacement(value ?? "");
                          setError("");
                        }}
                        height="100%"
                        loading={
                          <HStack
                            color="text.tertiary"
                            fontSize="sm"
                            spacing={2}
                          >
                            <Spinner size="sm" />
                            <Text>Loading editor…</Text>
                          </HStack>
                        }
                        options={{
                          ariaLabel: "ABI",
                          minimap: { enabled: false },
                          fontSize: 13,
                          fontFamily: "var(--font-jetbrains-mono), monospace",
                          lineHeight: 21,
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                          tabSize: 2,
                          padding: { top: 14, bottom: 14 },
                          wordWrap: "on",
                          folding: true,
                          formatOnPaste: true,
                          renderLineHighlight: "none",
                          overviewRulerLanes: 0,
                          hideCursorInOverviewRuler: true,
                          scrollbar: {
                            verticalScrollbarSize: 8,
                            horizontalScrollbarSize: 8,
                          },
                        }}
                      />
                    </Box>
                  </FormControl>
                </TabPanel>
                <TabPanel px={0} pt={5} pb={0}>
                  <VStack align="stretch" spacing={5}>
                    <FormControl>
                      <HStack justify="space-between" mb={2}>
                        <FormLabel
                          htmlFor="abi-source-address"
                          mb={0}
                          fontSize="sm"
                          fontWeight="medium"
                          color="text.secondary"
                        >
                          Source contract
                        </FormLabel>
                        <AddressBookButton isDisabled={loading} onSelect={(address) => {
                          setSourceAddress(address);
                          setError("");
                        }} />
                      </HStack>
                      <Input
                        id="abi-source-address"
                        isDisabled={loading}
                        value={sourceAddress}
                        onChange={(event) => {
                          const explorer = parseContractExplorerUrl(
                            event.target.value
                          );
                          setSourceAddress(
                            explorer?.address ?? event.target.value
                          );
                          if (explorer)
                            setNetwork(
                              networkOptions.find(
                                (option) => option.value === explorer.chainId
                              ) ?? null
                            );
                          setError("");
                        }}
                        placeholder="0x... or explorer URL"
                        fontFamily="mono"
                        fontSize="sm"
                        bg="bg.subtle"
                        borderRadius="md"
                      />
                    </FormControl>
                    <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4}>
                      <FormControl>
                        <FormLabel
                          fontSize="sm"
                          fontWeight="medium"
                          color="text.secondary"
                        >
                          Source network
                        </FormLabel>
                        <NetworkSelect
                          ariaLabel="Source network"
                          isDisabled={loading}
                          options={networkOptions}
                          selectedOption={network}
                          setSelectedOption={setNetwork}
                          controlProps={{ h: 10, minH: 10, borderRadius: "md" }}
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel
                          htmlFor="abi-import-mode"
                          fontSize="sm"
                          fontWeight="medium"
                          color="text.secondary"
                        >
                          Import mode
                        </FormLabel>
                        <Select
                          id="abi-import-mode"
                          isDisabled={loading}
                          value={importMode}
                          onChange={(event) =>
                            setImportMode(event.target.value)
                          }
                          bg="bg.subtle"
                          borderRadius="md"
                          fontSize="sm"
                        >
                          <option value="replace">Replace current ABI</option>
                          <option value="merge">Merge with current ABI</option>
                        </Select>
                      </FormControl>
                    </SimpleGrid>
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
            {error && (
              <Text
                role="alert"
                color="red.300"
                mt={4}
                fontSize="sm"
                overflowWrap="anywhere"
              >
                {error}
              </Text>
            )}
          </ModalBody>
          <ModalFooter
            flexShrink={0}
            gap={3}
            px={{ base: 4, md: 6 }}
            py={4}
            borderTop="1px solid"
            borderColor="border.subtle"
            bg="bg.subtle"
            flexWrap="wrap"
            justifyContent="space-between"
          >
            {isCustom && (
              <Button
                size="sm"
                variant="ghost"
                color="text.secondary"
                leftIcon={<RotateCcw size={13} />}
                isDisabled={loading}
                onClick={() => {
                  onReset();
                  submittedAfterClose.current = true;
                  close();
                }}
              >
                Reset ABI
              </Button>
            )}
            <HStack ml="auto" spacing={2}>
              <Button size="sm" variant="ghost" onClick={close}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                leftIcon={<Check size={14} />}
                onClick={apply}
                isLoading={loading}
              >
                {tab === 2 ? "Import ABI" : "Apply ABI"}
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
