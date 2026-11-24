"use client";
import { AddressBookButton } from "@/components/AddressBook/AddressBookButton";
import type { ContractImportRequest } from "./useWorkspaceUrl";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
} from "@chakra-ui/react";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  FolderPlus,
  Import,
  X,
} from "lucide-react";
import { NetworkSelect } from "@/components/NetworkSelect";
import { parseContractAddressInput } from "@/lib/contractExplorerInput";
import {
  parseExplorerInput,
  PROVIDERS,
  providersFor,
  VERIFICATION_CHAINS,
  explorerUrl,
} from "@/lib/verification/source";
import { readJson } from "@/lib/verification/transport";
import { compilerVersion } from "@/lib/solidity/settings";
import {
  verifiedContractBackup,
  verifiedContractWorkspace,
  type VerifiedContract,
} from "@/lib/solidity/verifiedContract";
import {
  validateWorkspaceName,
  type SolidityWorkspace,
} from "@/lib/solidity/workspace";

const networks = Object.keys(VERIFICATION_CHAINS)
  .filter((id) => providersFor(id).length)
  .map((id) => ({ id: Number(id), ...VERIFICATION_CHAINS[id] }));
export function ImportVerifiedContract({
  disabled,
  workspaceNames,
  onCreate,
  onOpen,
  request,
  onRequestDone,
}: {
  request?: ContractImportRequest;
  onRequestDone?(id?: number): void;
  disabled: boolean;
  workspaceNames: string[];
  onCreate(
    name: string,
    workspace: SolidityWorkspace,
    contract: VerifiedContract
  ): Promise<void>;
  onOpen(): void;
}) {
  const [isOpen, setOpen] = useState(false);
  const [chainId, setChain] = useState(1);
  const [address, setAddress] = useState("");
  const [contract, setContract] = useState<VerifiedContract>();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef<AbortController | null>(null);
  const locked = useRef(false);
  const automatic = useRef(false);
  const requestRun = useRef<number | undefined>(undefined);
  const finish = useRef(onRequestDone);
  finish.current = onRequestDone;
  useEffect(() => () => pending.current?.abort(), []);
  const cancelLookup = () => {
    pending.current?.abort();
    pending.current = null;
    setBusy(false);
  };
  const close = () => {
    if (!locked.current) {
      cancelLookup();
      setOpen(false);
      automatic.current = false;
      finish.current?.(request?.id);
    }
  };
  const edit = () => {
    cancelLookup();
    setContract(undefined);
    setError("");
  };
  const inferred = (input: string) => {
    const parsed =
      parseContractAddressInput(input) ?? parseExplorerInput(input);
    if (!parsed) return false;
    setAddress(parsed.address);
    setChain(Number(parsed.chainId));
    return true;
  };
  const lookup = async (explicit?: { address: string; chainId: number }) => {
    if (disabled || busy || locked.current) return;
    const parsed =
      parseContractAddressInput(address) ?? parseExplorerInput(address);
    const target =
      explicit ??
      (parsed
        ? { chainId: Number(parsed.chainId), address: parsed.address }
        : { chainId, address: address.trim() });
    if (!/^0x[a-fA-F0-9]{40}$/.test(target.address)) {
      setError("Enter a contract address or explorer link.");
      return;
    }
    const originRequestId = request?.id;
    cancelLookup();
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError("");
    setAddress(target.address);
    setChain(target.chainId);
    try {
      const signal = AbortSignal.any([
        controller.signal,
        AbortSignal.timeout(25_000),
      ]);
      const response = await fetch(
        `/api/solidity/import-contract?chainId=${target.chainId}&address=${target.address}`,
        { signal, credentials: "omit", cache: "no-store" }
      );
      const data = (await readJson(
        response.body,
        4_000_000,
        signal
      )) as VerifiedContract & { error?: string };
      if (pending.current !== controller || controller.signal.aborted) return;
      if (!response.ok)
        throw new Error(data.error ?? "Couldn't fetch verified source.");
      if (
        data.chainId !== target.chainId ||
        data.address.toLowerCase() !== target.address.toLowerCase()
      )
        throw new Error("The source response doesn't match this contract.");
      verifiedContractBackup(data.source);
      setContract(data);
      const base = data.source.contractName
        .slice(data.source.contractName.lastIndexOf(":") + 1)
        .slice(0, 50);
      let suggestion = base;
      let suffix = 2;
      while (
        workspaceNames.some(
          (existing) => existing.toLowerCase() === suggestion.toLowerCase()
        )
      )
        suggestion = `${base} ${suffix++}`;
      setName(suggestion);
      if (automatic.current) await persist(data, suggestion, originRequestId);
    } catch (cause) {
      if (pending.current === controller && !controller.signal.aborted)
        setError(
          cause instanceof Error && cause.name !== "TimeoutError"
            ? cause.message
            : "The source lookup timed out. Try again."
        );
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setBusy(false);
      }
    }
  };
  const persist = async (
    selected: VerifiedContract,
    workspaceName: string,
    originRequestId = request?.id
  ) => {
    if (disabled || locked.current) return;
    locked.current = true;
    setCreating(true);
    setError("");
    try {
      const checked = validateWorkspaceName(workspaceName);
      if (
        workspaceNames.some(
          (existing) => existing.toLowerCase() === checked.toLowerCase()
        )
      )
        throw new Error("A workspace with that name already exists.");
      await onCreate(
        checked,
        verifiedContractWorkspace(selected.source),
        selected
      );
      finish.current?.(originRequestId);
      setOpen(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Couldn't create the workspace."
      );
    } finally {
      locked.current = false;
      setCreating(false);
    }
  };
  const create = async () => {
    if (contract) await persist(contract, name);
  };
  useEffect(() => {
    if (!request || disabled || requestRun.current === request.id) return;
    requestRun.current = request.id;
    onOpen();
    edit();
    automatic.current = request.automatic;
    setAddress(request.address);
    setChain(request.chainId ?? 1);
    setOpen(true);
    if (request.error) setError(request.error);
    else if (request.automatic && request.chainId)
      void lookup({ address: request.address, chainId: request.chainId });
    return () => {
      // Effect replay or changing URL cancels a lookup, never a started save.
      if (
        !locked.current &&
        pending.current &&
        requestRun.current === request.id
      ) {
        pending.current.abort();
        pending.current = null;
        requestRun.current = undefined;
      }
    };
  }, [request?.id, disabled]);
  const preview = contract
    ? verifiedContractBackup(contract.source)
    : undefined;
  return (
    <>
      <Button
        size="sm"
        h={8}
        fontSize="xs"
        variant="outline"
        leftIcon={<Import size={14} />}
        isDisabled={disabled}
        onClick={() => {
          onOpen();
          automatic.current = false;
          edit();
          setAddress("");
          setOpen(true);
        }}
      >
        Import verified contract
      </Button>
      <Modal isOpen={isOpen} onClose={close} isCentered scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent mx={4} bg="bg.muted" maxH="calc(100dvh - 2rem)">
          <ModalHeader fontSize="lg" pb={3}>
            Import verified contract
          </ModalHeader>
          <ModalCloseButton isDisabled={creating} />
          <ModalBody pt={0}>
            <Stack spacing={5}>
              {!contract ? (
                <>
                  <FormControl>
                    <HStack justify="space-between" mb={2}>
                      <FormLabel fontSize="sm" mb={0}>Contract address or explorer URL</FormLabel>
                      <AddressBookButton isDisabled={creating} onSelect={(value) => {
                        edit();
                        setAddress(value);
                      }} />
                    </HStack>
                    <Input
                      aria-label="Verified contract address"
                      value={address}
                      placeholder="0x or explorer link"
                      autoComplete="off"
                      autoFocus
                      fontSize="sm"
                      borderRadius="lg"
                      onChange={(event) => {
                        edit();
                        setAddress(event.target.value);
                      }}
                      onPaste={(event) => {
                        const value = event.clipboardData
                          .getData("text")
                          .trim();
                        if (
                          parseContractAddressInput(value) ||
                          parseExplorerInput(value)
                        ) {
                          event.preventDefault();
                          edit();
                          inferred(value);
                        }
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void lookup();
                      }}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm">Network</FormLabel>
                    <NetworkSelect
                      ariaLabel="Verified contract network"
                      networks={networks}
                      chainId={chainId}
                      onChange={(id) => {
                        edit();
                        setChain(id);
                      }}
                      controlProps={{ fontSize: "sm" }}
                    />
                  </FormControl>
                </>
              ) : (
                <>
                  <Box
                    borderWidth="1px"
                    borderColor="border.default"
                    rounded="lg"
                    p={4}
                  >
                    <HStack justify="space-between" align="start" gap={3}>
                      <Text
                        fontSize="sm"
                        fontWeight="semibold"
                        overflowWrap="anywhere"
                      >
                        {contract.source.contractName.split(":").at(-1)}
                      </Text>
                      <Link
                        href={explorerUrl(
                          contract.provider,
                          String(contract.chainId),
                          contract.address
                        )}
                        isExternal
                        fontSize="xs"
                        color="primary.300"
                        display="inline-flex"
                        gap={1}
                        alignItems="center"
                        flexShrink={0}
                      >
                        {PROVIDERS[contract.provider]}{" "}
                        <ExternalLink size={12} />
                      </Link>
                    </HStack>
                    <Text fontSize="xs" color="text.secondary" mt={1}>
                      {VERIFICATION_CHAINS[contract.chainId]?.name} · solc{" "}
                      {compilerVersion(preview!.compilerSettings!.version)}
                    </Text>
                    <Text
                      fontSize="xs"
                      color="text.secondary"
                      mt={2}
                      overflowWrap="anywhere"
                    >
                      {preview!.activeFile}
                    </Text>
                    <Box as="details" mt={2} fontSize="xs">
                      <Box as="summary" cursor="pointer">
                        {preview!.files.length}{" "}
                        {preview!.files.length === 1 ? "file" : "files"}
                      </Box>
                      <Box maxH="160px" overflowY="auto" mt={2}>
                        {preview!.files.map((file) => (
                          <Text
                            key={file.name}
                            py={1}
                            overflowWrap="anywhere"
                            fontFamily="mono"
                          >
                            {file.name}
                          </Text>
                        ))}
                      </Box>
                    </Box>
                  </Box>
                  {contract.source.implementationAddress && (
                    <Alert
                      status="info"
                      bg="whiteAlpha.50"
                      color="text.secondary"
                      rounded="md"
                      fontSize="xs"
                    >
                      <AlertIcon />
                      <Text>
                        This imports the proxy source. Its implementation is a
                        separate contract.
                      </Text>
                    </Alert>
                  )}
                  <FormControl>
                    <FormLabel fontSize="sm">Workspace name</FormLabel>
                    <Input
                      aria-label="Verified contract workspace name"
                      value={name}
                      onChange={(event) => {
                        setName(event.target.value);
                        setError("");
                      }}
                      maxLength={60}
                      isDisabled={creating}
                      fontSize="sm"
                      borderRadius="lg"
                    />
                  </FormControl>
                </>
              )}
              {error && (
                <Alert status="error" rounded="md" fontSize="sm">
                  <AlertIcon />
                  <Text overflowWrap="anywhere">{error}</Text>
                </Alert>
              )}
            </Stack>
          </ModalBody>
          <ModalFooter gap={2} flexWrap="wrap">
            <Button
              size="sm"
              mr="auto"
              leftIcon={<X size={14} />}
              onClick={close}
              isDisabled={creating}
            >
              Cancel
            </Button>
            {contract && (
              <Button
                size="sm"
                leftIcon={<ArrowLeft size={14} />}
                onClick={edit}
                isDisabled={creating}
              >
                Back
              </Button>
            )}
            <Button
              size="sm"
              variant="primary"
              rightIcon={!contract ? <ArrowRight size={14} /> : undefined}
              leftIcon={contract ? <FolderPlus size={14} /> : undefined}
              isLoading={busy || creating}
              loadingText={creating ? "Creating…" : "Fetching…"}
              isDisabled={disabled || (!contract && !address.trim())}
              onClick={() => void (contract ? create() : lookup())}
            >
              {contract ? "Create workspace" : "Fetch source"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
