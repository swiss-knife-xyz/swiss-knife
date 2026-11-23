"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  HStack,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { CheckCircle2, ChevronDown, History, RefreshCw } from "lucide-react";
import { AddressInput } from "@/components/fnParams/inputs/AddressInput";
import {
  libraryAddress,
  libraryKey,
  reusableLibrary,
  type LibraryReference,
  type LibraryAddresses,
} from "@/lib/solidity/libraries";
import { checkLibraryAddresses } from "@/lib/solidity/libraryCode";
import { slicedText } from "@/utils";
import type { DeploymentRecord } from "@/lib/solidity/deployments";
import type { CompilerBuild } from "./useSolidityCompiler";
import type { DeploymentHistoryController } from "./useDeploymentHistory";

type Validity = { scope: string; valid: boolean };
const fieldScope = (
  ref: LibraryReference,
  value: string,
  chainId: number,
  rpcRevision: number,
  ready: boolean
) =>
  JSON.stringify([
    libraryKey(ref),
    libraryAddress(value),
    chainId,
    rpcRevision,
    ready,
  ]);
function LibraryField({
  reference,
  value,
  chainId,
  rpcRevision,
  rpcReady,
  disabled,
  previous,
  onChange,
  onValidity,
}: {
  reference: LibraryReference;
  value: string;
  chainId: number;
  rpcRevision: number;
  rpcReady: boolean;
  disabled: boolean;
  previous: DeploymentRecord[];
  onChange(value: string): void;
  onValidity(key: string, result: Validity): void;
}) {
  const address = libraryAddress(value);
  const scope = fieldScope(reference, value, chainId, rpcRevision, rpcReady);
  const [attempt, setAttempt] = useState(0);
  const [check, setCheck] = useState<{
    scope: string;
    state: "valid" | "error";
    error?: string;
  } | null>(null);
  const valid = check?.scope === scope && check.state === "valid";
  const error =
    check?.scope === scope && check.state === "error" ? check.error : "";
  useEffect(() => {
    onValidity(libraryKey(reference), { scope, valid });
  }, [scope, valid, onValidity, reference]);
  useEffect(() => {
    if (!address || !rpcReady) return;
    let cancelled = false;
    setCheck(null);
    const timer = setTimeout(() => {
      void checkLibraryAddresses(chainId, [reference], {
        [reference.sourcePath]: { [reference.name]: address },
      }).then(
        () => {
          if (!cancelled) setCheck({ scope, state: "valid" });
        },
        (error) => {
          if (!cancelled)
            setCheck({
              scope,
              state: "error",
              error:
                error instanceof Error
                  ? error.message
                  : "Couldn't check this address.",
            });
        }
      );
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [scope, attempt]);
  return (
    <Box>
      <Text fontSize="xs" color="text.tertiary" mb={1} overflowWrap="anywhere">
        {reference.sourcePath}
      </Text>
      <AddressInput
        input={{ name: reference.name, type: "address" }}
        value={value}
        chainId={chainId}
        aria-label={`${reference.name} library address`}
        isDisabled={disabled}
        hideQuickFillButtons
        hideTags
        onChange={(event) => onChange(event.target.value)}
        labelAction={
          previous.length ? (
            <Menu size="compact" placement="bottom-end">
              <MenuButton
                as={Button}
                size="xs"
                variant="ghost"
                color="primary.300"
                isDisabled={disabled}
                leftIcon={<History size={12} />}
                rightIcon={<ChevronDown size={12} />}
              >
                Use previous
              </MenuButton>
              <MenuList>
                {previous.map((record) => (
                  <MenuItem
                    key={record.id}
                    onClick={() => onChange(record.address!)}
                  >
                    {slicedText(record.address!)} ·{" "}
                    {new Date(record.createdAt).toLocaleDateString()}
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>
          ) : undefined
        }
      />
      <HStack mt={1.5} minH={4} spacing={1} justify={valid ? "center" : undefined}>
        {valid ? (
          <>
            <CheckCircle2 size={12} color="var(--chakra-colors-green-300)" />
            <Text fontSize="xs" color="text.secondary">
              Code found
            </Text>
          </>
        ) : error ? (
          <>
            <Text role="alert" fontSize="xs" color="red.300" flex={1}>
              {error}
            </Text>
            <Button
              size="xs"
              variant="ghost"
              aria-label={`Retry ${reference.name} code check`}
              onClick={() => setAttempt((value) => value + 1)}
              leftIcon={<RefreshCw size={12} />}
            >
              Retry
            </Button>
          </>
        ) : address ? (
          <>
            <Spinner size="xs" />
            <Text fontSize="xs" color="text.tertiary">
              Checking code…
            </Text>
          </>
        ) : value ? (
          <Text fontSize="xs" color="text.tertiary">
            Enter an address or resolve a name.
          </Text>
        ) : null}
      </HStack>
    </Box>
  );
}
export function LibraryLinks({
  refs,
  addresses,
  chainId,
  build,
  history,
  disabled,
  rpcRevision,
  rpcReady,
  imported,
  onImport,
  onChange,
  onReady,
}: {
  refs: LibraryReference[];
  addresses: LibraryAddresses;
  chainId: number;
  build?: CompilerBuild;
  history: DeploymentHistoryController;
  disabled: boolean;
  rpcRevision: number;
  rpcReady: boolean;
  imported?: LibraryAddresses;
  onImport(): void;
  onChange(ref: LibraryReference, value: string): void;
  onReady(ready: boolean): void;
}) {
  const [statuses, setStatuses] = useState<Record<string, Validity>>({});
  const onValidity = useCallback(
    (key: string, result: Validity) =>
      setStatuses((current) =>
        current[key]?.scope === result.scope &&
        current[key]?.valid === result.valid
          ? current
          : { ...current, [key]: result }
      ),
    []
  );
  const ready = refs.every((ref) => {
    const result = statuses[libraryKey(ref)];
    return (
      result?.valid &&
      result.scope ===
        fieldScope(
          ref,
          addresses[ref.sourcePath]?.[ref.name] ?? "",
          chainId,
          rpcRevision,
          rpcReady
        )
    );
  });
  useEffect(() => onReady(ready), [ready, onReady]);
  const refsKey = JSON.stringify(refs);
  const candidates = useMemo(
    () =>
      history.records.filter(
        (record) =>
          record.chainId === chainId &&
          record.status === "success" &&
          record.address &&
          !record.deletedAt &&
          refs.some(
            (ref) =>
              ref.sourcePath === record.sourcePath &&
              ref.name === record.contractName
          )
      ),
    [history.records, chainId, refsKey]
  );
  const candidateKey = JSON.stringify(
    candidates.map((record) => [record.id, record.buildId, record.address])
  );
  const [previous, setPrevious] = useState<Record<string, DeploymentRecord[]>>(
    {}
  );
  useEffect(() => {
    let cancelled = false;
    if (!build) {
      setPrevious({});
      return;
    }
    setPrevious({});
    let index = 0;
    const found: Record<string, DeploymentRecord[]> = Object.create(null);
    const load = async () => {
      while (index < candidates.length) {
        const record = candidates[index++];
        const saved = await history.getBuild(record.buildId).catch(() => null);
        if (cancelled) return;
        if (!saved) continue;
        for (const ref of refs)
          if (reusableLibrary(record, saved, build, ref, chainId))
            (found[libraryKey(ref)] ??= []).push(record);
      }
    };
    void Promise.all(
      Array.from({ length: Math.min(4, candidates.length) }, load)
    ).then(() => {
      if (!cancelled) setPrevious(found);
    });
    return () => {
      cancelled = true;
    };
  }, [candidateKey, build?.input.fingerprint, chainId, refsKey]);
  if (!refs.length) return null;
  const canImport =
    imported &&
    refs.some(
      (ref) =>
        !addresses[ref.sourcePath]?.[ref.name] &&
        libraryAddress(imported[ref.sourcePath]?.[ref.name])
    );
  return (
    <Box
      as="fieldset"
      w="full"
      minW={0}
      borderWidth="1px"
      borderColor="border.default"
      borderRadius="lg"
      px={3}
      pb={3}
    >
      <Box as="legend" px={2}>
        <Text fontSize="sm" color="text.secondary">
          Libraries
        </Text>
      </Box>
      <VStack align="stretch" spacing={3} pt={2}>
        {canImport && (
          <Button
            alignSelf="start"
            size="xs"
            variant="outline"
            isDisabled={disabled}
            onClick={onImport}
          >
            Use imported addresses
          </Button>
        )}
        {refs.map((ref) => (
          <LibraryField
            key={`${chainId}:${libraryKey(ref)}`}
            reference={ref}
            value={addresses[ref.sourcePath]?.[ref.name] ?? ""}
            chainId={chainId}
            disabled={disabled}
            rpcRevision={rpcRevision}
            rpcReady={rpcReady}
            previous={previous[libraryKey(ref)] ?? []}
            onChange={(value) => onChange(ref, value)}
            onValidity={onValidity}
          />
        ))}
      </VStack>
    </Box>
  );
}
