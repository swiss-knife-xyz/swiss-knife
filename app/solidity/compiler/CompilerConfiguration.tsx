"use client";
import { useEffect, useState } from "react";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormLabel,
  HStack,
  Input,
  InputGroup,
  InputLeftAddon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
  useDisclosure,
} from "@chakra-ui/react";
import { Settings2 } from "lucide-react";
import { DarkSelect } from "@/components/DarkSelect";
import {
  compilerVersion,
  DEFAULT_COMPILER_SETTINGS,
  evmTargets,
  normalizeCompilerSettings,
  supportsIR,
  type CompilerSettings,
} from "@/lib/solidity/settings";

import {
  loadCompilerReleases,
  type CompilerRelease,
} from "@/lib/solidity/compilerVersions";

export function CompilerConfiguration({
  settings,
  disabled,
  onChange,
}: {
  settings: CompilerSettings;
  disabled: boolean;
  onChange(settings: CompilerSettings): void;
}) {
  const modal = useDisclosure();
  const [draft, setDraft] = useState(settings);
  const [runs, setRuns] = useState(String(settings.runs));
  const [options, setOptions] = useState<CompilerRelease[]>([]);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!modal.isOpen) return;
    let canceled = false;
    setLoadError("");
    setLoading(true);
    loadCompilerReleases()
      .then((value) => {
        if (!canceled) setOptions(value);
      })
      .catch(() => {
        if (!canceled)
          setLoadError(
            "Couldn't load compiler versions. Your current version is still available."
          );
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });
    return () => {
      canceled = true;
    };
  }, [modal.isOpen, attempt]);
  const versionOptions = options.some(
    (option) => option.value === draft.version
  )
    ? options
    : [
        { label: compilerVersion(draft.version), value: draft.version },
        ...options,
      ];
  return (
    <>
      <Button
        size="sm"
        variant="outline"
        leftIcon={<Settings2 size={14} />}
        fontWeight="normal"
        isDisabled={disabled}
        onClick={() => {
          setDraft(settings);
          setRuns(String(settings.runs));
          setError("");
          modal.onOpen();
        }}
      >
        solc {compilerVersion(settings.version)}
      </Button>
      <Modal
        isOpen={modal.isOpen}
        onClose={modal.onClose}
        isCentered
        scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent
          mx={4}
          bg="bg.muted"
          borderWidth="1px"
          borderColor="border.default"
          borderRadius="xl"
        >
          <ModalHeader fontSize="lg">Compiler settings</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={3}>
            <VStack align="stretch" spacing={4}>
              <FormControl>
                <FormLabel fontSize="sm">
                  Compiler version{loading ? " · Loading…" : ""}
                </FormLabel>
                <DarkSelect
                  ariaLabel="Compiler version"
                  options={versionOptions}
                  selectedOption={
                    versionOptions.find(
                      (option) => option.value === draft.version
                    )!
                  }
                  setSelectedOption={(option) => {
                    if (!option) return;
                    const version = String(option.value);
                    setDraft((current) => ({
                      ...current,
                      version,
                      viaIR: supportsIR(version) && current.viaIR,
                      evmVersion: evmTargets(version).includes(
                        current.evmVersion
                      )
                        ? current.evmVersion
                        : "default",
                    }));
                  }}
                  isDisabled={loading}
                  boxProps={{ minW: 0 }}
                />
                {loadError && (
                  <Box mt={2}>
                    <Text fontSize="xs" color="error.text">
                      {loadError}
                    </Text>
                    <Button
                      size="xs"
                      mt={1}
                      onClick={() => setAttempt((value) => value + 1)}
                    >
                      Retry
                    </Button>
                  </Box>
                )}
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">EVM target</FormLabel>
                <DarkSelect
                  ariaLabel="EVM target"
                  options={[
                    { label: "Compiler default", value: "default" },
                    ...evmTargets(draft.version).map((value) => ({
                      label: value,
                      value,
                    })),
                  ]}
                  selectedOption={{
                    label:
                      draft.evmVersion === "default"
                        ? "Compiler default"
                        : draft.evmVersion,
                    value: draft.evmVersion,
                  }}
                  setSelectedOption={(option) =>
                    option &&
                    setDraft((current) => ({
                      ...current,
                      evmVersion: String(option.value),
                    }))
                  }
                  boxProps={{ minW: 0 }}
                />
              </FormControl>
              <VStack
                align="stretch"
                spacing={3}
                borderWidth="1px"
                borderColor="border.default"
                borderRadius="lg"
                p={3}
              >
                <HStack align="center" spacing={4} flexWrap="wrap" rowGap={2}>
                  <Checkbox
                    isChecked={draft.optimizer}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        optimizer: event.target.checked,
                      }))
                    }
                  >
                    Optimizer
                  </Checkbox>
                  <InputGroup
                    size="sm"
                    w="7rem"
                    h={8}
                    borderWidth="1px"
                    borderColor="border.default"
                    borderRadius="lg"
                    bg="whiteAlpha.50"
                    overflow="hidden"
                    _focusWithin={{
                      borderColor: "primary.400",
                      boxShadow: "0 0 0 1px var(--chakra-colors-primary-400)",
                    }}
                  >
                    <InputLeftAddon
                      px={2}
                      fontSize="xs"
                      color="text.secondary"
                      bg="transparent"
                      border={0}
                      h="full"
                    >
                      Runs
                    </InputLeftAddon>
                    <Input
                      aria-label="Optimizer runs"
                      bg="transparent"
                      border={0}
                      h="full"
                      size="sm"
                      borderRadius={0}
                      _focusVisible={{ boxShadow: "none" }}
                      inputMode="numeric"
                      value={runs}
                      isDisabled={!draft.optimizer}
                      onChange={(event) => {
                        setRuns(event.target.value);
                        setError("");
                      }}
                    />
                  </InputGroup>
                </HStack>
                <Box borderTopWidth="1px" borderColor="border.default" pt={3}>
                  <Checkbox
                    isChecked={draft.viaIR}
                    isDisabled={!supportsIR(draft.version)}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        viaIR: event.target.checked,
                      }))
                    }
                  >
                    Via IR
                  </Checkbox>
                  {!supportsIR(draft.version) && (
                    <Text fontSize="xs" color="text.secondary">
                      Via IR requires solc 0.8.13 or later.
                    </Text>
                  )}
                </Box>
              </VStack>
              {error && (
                <Alert status="error" borderRadius="lg">
                  <AlertIcon />
                  {error}
                </Alert>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter gap={2} pt={3} flexWrap="wrap">
            <Button
              size="sm"
              mr="auto"
              variant="ghost"
              onClick={() => {
                setDraft(DEFAULT_COMPILER_SETTINGS);
                setRuns("200");
                setError("");
              }}
            >
              Reset
            </Button>
            <Button size="sm" onClick={modal.onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              isDisabled={disabled}
              onClick={() => {
                try {
                  if (draft.optimizer && !/^\d+$/.test(runs))
                    throw new Error("Enter a whole number for optimizer runs.");
                  const next = normalizeCompilerSettings({
                    ...draft,
                    runs: draft.optimizer ? Number(runs) : draft.runs,
                  });
                  onChange(next);
                  modal.onClose();
                } catch (cause) {
                  setError((cause as Error).message);
                }
              }}
            >
              Apply
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
