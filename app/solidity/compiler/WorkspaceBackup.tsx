"use client";
import { dependencyCompilerSettings } from "@/lib/solidity/dependencySettings";
import { useRef, useState } from "react";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  HStack,
  Input,
  MenuItem,
  MenuDivider,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Radio,
  RadioGroup,
  Spinner,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  FolderPlus,
  Upload,
  X,
} from "lucide-react";
import {
  exportWorkspaceZip,
  importWorkspaceZip,
  planWorkspaceImport,
  applyWorkspaceImport,
  BACKUP_LIMITS,
  type WorkspaceBackup,
} from "@/lib/solidity/backup";
import {
  importStandardJson,
  STANDARD_JSON_LIMIT,
} from "@/lib/solidity/standardJson";
import {
  compilerVersion,
  normalizeCompilerSettings,
  standardJsonInput,
} from "@/lib/solidity/settings";
import {
  loadCompilerReleases,
  selectCompilerRelease,
  solidityPragmas,
} from "@/lib/solidity/compilerVersions";
import { CompilerConfiguration } from "./CompilerConfiguration";
import { DarkSelect } from "@/components/DarkSelect";
import {
  validateWorkspaceName,
  type SolidityWorkspace,
} from "@/lib/solidity/workspace";

type Props = {
  children: (menu: React.ReactNode) => React.ReactNode;
  workspace: SolidityWorkspace | null;
  workspaceName: string;
  workspaceNames: string[];
  onCreate(name: string, workspace: SolidityWorkspace): Promise<void>;
  update(edit: (current: SolidityWorkspace) => SolidityWorkspace): void;
  disabled: boolean;
  onOpen(): void;
};

export function WorkspaceBackupActions({
  workspace,
  workspaceName,
  workspaceNames,
  onCreate,
  update,
  disabled,
  onOpen,
  children,
}: Props) {
  const [exporting, setExporting] = useState(false);
  const [reading, setReading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [backup, setBackup] = useState<WorkspaceBackup | null>(null);
  const [mode, setMode] = useState<"add" | "new">("add");
  const [newName, setNewName] = useState("");
  const [importing, setImporting] = useState(false);
  const [detectingVersion, setDetectingVersion] = useState(false);
  const [versionError, setVersionError] = useState("");
  const versionRequest = useRef(0);
  const [error, setError] = useState("");
  const [filename, setFilename] = useState("");
  const [isJson, setIsJson] = useState(false);
  const [step, setStep] = useState(0);
  const stages =
    isJson && mode === "new" ? ["Mode", "Setup", "Review"] : ["Mode", "Review"];
  const stage = stages[step];
  const jsonPicker = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const preview =
    workspace && backup
      ? planWorkspaceImport(
          mode === "new"
            ? { files: [], openFileIds: [], activeFileId: null }
            : workspace,
          backup,
          mode === "new" ? "restore" : "add"
        )
      : [];
  const renamed = preview.filter(
    (file) => file.name !== file.originalName
  ).length;
  const download = async () => {
    if (!workspace || exporting) return;
    setExporting(true);
    try {
      const data = await exportWorkspaceZip(workspace);
      const url = URL.createObjectURL(
        new Blob([new Uint8Array(data).buffer], { type: "application/zip" })
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "solidity-workspace.zip";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      toast({
        title: "Backup failed",
        description:
          error instanceof Error ? error.message : "Couldn't export files.",
        status: "error",
        isClosable: true,
      });
    } finally {
      setExporting(false);
    }
  };
  const downloadStandardJson = () => {
    if (disabled || !workspace?.files.length || exporting) return;
    try {
      const settings = dependencyCompilerSettings(
        workspace.compilerSettings,
        workspace.dependencies
      );
      const input = standardJsonInput(
        Object.fromEntries(
          workspace.files.map((file) => [file.name, { content: file.content }])
        ),
        settings
      );
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(input, null, 2)], { type: "application/json" })
      );
      const link = document.createElement("a");
      const name =
        workspaceName
          .replace(/[^a-zA-Z0-9._-]+/g, "-")
          .replace(/^-+|-+$/g, "") || "workspace";
      link.href = url;
      link.download = `${name}-solc-${compilerVersion(settings.version)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      toast({
        title: "Export failed",
        description:
          cause instanceof Error
            ? cause.message
            : "Couldn't export Standard JSON.",
        status: "error",
        isClosable: true,
      });
    }
  };
  const detectVersion = async (imported: WorkspaceBackup) => {
    const request = ++versionRequest.current;
    setVersionError("");
    const entry = imported.files.find(
      (file) => file.name === imported.activeFile
    );
    if (!entry || !solidityPragmas(entry.content).length) {
      setDetectingVersion(false);
      return;
    }
    setDetectingVersion(true);
    try {
      const available = await loadCompilerReleases();
      const version = selectCompilerRelease(
        imported.files,
        entry.name,
        available,
        imported.compilerSettings ?? normalizeCompilerSettings()
      );
      if (request !== versionRequest.current) return;
      if (version)
        setBackup((current) =>
          current && current.activeFile === entry.name
            ? {
                ...current,
                compilerSettings: {
                  ...normalizeCompilerSettings(),
                  ...current.compilerSettings,
                  version,
                },
              }
            : current
        );
    } catch (cause) {
      if (request === versionRequest.current)
        setVersionError(
          "Couldn't auto-select a compiler. Choose one manually."
        );
    } finally {
      if (request === versionRequest.current) setDetectingVersion(false);
    }
  };
  const read = async (file: File, json = false) => {
    onOpen();
    setIsOpen(true);
    setFilename(file.name);
    setReading(true);
    setBackup(null);
    versionRequest.current++;
    setDetectingVersion(false);
    setVersionError("");
    setError("");
    setMode("new");
    const base =
      file.name
        .replace(/\.(json|zip)$/i, "")
        .replace(/[-_]standard[-_]input$/i, "")
        .trim()
        .slice(0, 55) || "Imported workspace";
    let suggested = base;
    let suffix = 2;
    while (
      workspaceNames.some(
        (name) => name.toLowerCase() === suggested.toLowerCase()
      )
    )
      suggested = `${base} ${suffix++}`;
    setNewName(suggested);
    setIsJson(json);
    setStep(0);
    try {
      if (file.size > (json ? STANDARD_JSON_LIMIT : BACKUP_LIMITS.archiveBytes))
        throw new Error(
          `Choose a ${json ? "JSON" : "ZIP"} smaller than 20 MB.`
        );
      const imported = json
        ? importStandardJson(
            await file.text(),
            normalizeCompilerSettings(workspace?.compilerSettings)
          )
        : await importWorkspaceZip(await file.arrayBuffer());
      setBackup(imported);
      if (json) void detectVersion(imported);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Couldn't read this backup."
      );
    } finally {
      setReading(false);
    }
  };
  const apply = async () => {
    if (!backup || disabled || importing) return;
    setImporting(true);
    try {
      const checked =
        mode === "new" && backup.compilerSettings
          ? {
              ...backup,
              compilerSettings: normalizeCompilerSettings(
                backup.compilerSettings
              ),
            }
          : backup;
      if (mode === "new") {
        const name = validateWorkspaceName(newName);
        const imported = applyWorkspaceImport(
          { files: [], folders: [], openFileIds: [], activeFileId: null },
          checked,
          "restore"
        );
        await onCreate(name, imported);
      } else update((current) => applyWorkspaceImport(current, checked, "add"));
      setIsOpen(false);
      setBackup(null);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Couldn't import these files."
      );
    } finally {
      setImporting(false);
    }
  };
  const next = () => {
    if (!backup || disabled || reading) return;
    try {
      if (stage === "Mode" && mode === "new") {
        const name = validateWorkspaceName(newName);
        if (
          workspaceNames.some(
            (existing) => existing.toLowerCase() === name.toLowerCase()
          )
        )
          throw new Error("A workspace with that name already exists.");
      }
      if (stage === "Setup") normalizeCompilerSettings(backup.compilerSettings);
      setError("");
      setStep((current) => Math.min(current + 1, stages.length - 1));
    } catch (cause) {
      setError((cause as Error).message);
    }
  };
  return (
    <>
      {children(
        <>
          <MenuItem
            icon={<Download size={15} />}
            isDisabled={
              disabled ||
              exporting ||
              !workspace ||
              (!workspace.files.length && !workspace.folders?.length)
            }
            onClick={() => void download()}
          >
            {exporting ? "Exporting workspace…" : "Export workspace ZIP"}
          </MenuItem>
          <MenuItem
            icon={<Upload size={15} />}
            isDisabled={disabled || !workspace || exporting}
            onClick={() => picker.current?.click()}
          >
            Import workspace ZIP
          </MenuItem>
          <MenuDivider />
          <MenuItem
            icon={<Upload size={15} />}
            isDisabled={disabled || !workspace || exporting}
            onClick={() => jsonPicker.current?.click()}
          >
            Import Standard JSON
          </MenuItem>
          <MenuItem
            icon={<Download size={15} />}
            isDisabled={disabled || !workspace?.files.length || exporting}
            onClick={downloadStandardJson}
          >
            Export Standard JSON
          </MenuItem>
        </>
      )}
      <input
        ref={picker}
        type="file"
        accept=".zip,application/zip"
        aria-label="Workspace ZIP file"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void read(file);
        }}
      />
      <input
        ref={jsonPicker}
        type="file"
        accept=".json,application/json"
        aria-label="Standard JSON input file"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void read(file, true);
        }}
      />
      <Modal
        isOpen={isOpen}
        onClose={() => {
          if (!reading && !importing) setIsOpen(false);
        }}
        isCentered
        scrollBehavior="inside"
      >
        <ModalOverlay />
        <ModalContent
          mx={4}
          my={4}
          bg="bg.muted"
          minW={0}
          maxH="calc(100dvh - 2rem)"
        >
          <ModalHeader fontSize="lg" pb={1} flexShrink={0}>
            {isJson ? "Import Standard JSON" : "Import workspace"}
          </ModalHeader>
          <ModalCloseButton isDisabled={reading || importing} />
          <Text
            px={6}
            fontSize="sm"
            color="text.secondary"
            mb={5}
            flexShrink={0}
            overflowWrap="anywhere"
          >
            {filename}
          </Text>
          <ModalBody pt={0} minH={0}>
            {backup && (
              <HStack
                as="ol"
                aria-label="Import progress"
                listStyleType="none"
                spacing={0}
                mb={4}
                flexShrink={0}
              >
                {stages.map((label, index) => (
                  <HStack
                    as="li"
                    key={label}
                    flex={1}
                    minW={0}
                    spacing={1}
                    aria-current={index === step ? "step" : undefined}
                  >
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      boxSize={6}
                      flexShrink={0}
                      borderRadius="full"
                      fontSize="xs"
                      borderWidth="1px"
                      borderColor={
                        index <= step ? "primary.400" : "border.default"
                      }
                      bg={index < step ? "primary.400" : "transparent"}
                      color={
                        index < step
                          ? "white"
                          : index === step
                            ? "text.primary"
                            : "text.tertiary"
                      }
                    >
                      {index < step ? <Check size={13} /> : index + 1}
                    </Box>
                    <Text
                      fontSize="xs"
                      fontWeight={index === step ? "semibold" : "normal"}
                      color={index <= step ? "text.primary" : "text.tertiary"}
                    >
                      {label}
                    </Text>
                    {index < stages.length - 1 && (
                      <Box flex={1} h="1px" bg="border.default" mx={2} />
                    )}
                  </HStack>
                ))}
              </HStack>
            )}
            {reading && (
              <HStack py={4}>
                <Spinner size="sm" />
                <Text fontSize="sm">Reading file…</Text>
              </HStack>
            )}
            {error && (
              <Alert status="error" rounded="md" fontSize="sm" flexShrink={0}>
                <AlertIcon />
                <Text overflowWrap="anywhere">{error}</Text>
              </Alert>
            )}
            {backup && (
              <Box pt={2} pb={3}>
                {stage === "Mode" && (
                  <Box>
                    <Text fontSize="sm" mb={2}>
                      Choose:
                    </Text>
                    <RadioGroup
                      value={mode}
                      onChange={(value) => {
                        setMode(value as "add" | "new");
                        setError("");
                      }}
                      isDisabled={importing}
                    >
                      <Stack spacing={1}>
                        {(
                          [
                            [
                              "add",
                              `Add files to current workspace (${workspaceName})`,
                            ],
                            ["new", "Create new workspace"],
                          ] as const
                        ).map(([value, label]) => (
                          <Radio
                            key={value}
                            value={value}
                            size="sm"
                            spacing={3}
                            display="flex"
                            alignItems="center"
                            w="full"
                            minH={8}
                            minW={0}
                            px={0}
                            py={1}
                            cursor="pointer"
                            sx={{
                              ".chakra-radio__control": {
                                flexShrink: 0,
                                alignSelf: "center",
                              },
                              ".chakra-radio__label": {
                                lineHeight: "1.5",
                                marginBlock: 0,
                                minWidth: 0,
                                overflowWrap: "anywhere",
                              },
                            }}
                          >
                            {label}
                          </Radio>
                        ))}
                      </Stack>
                    </RadioGroup>
                    {mode === "new" && (
                      <Box mt={7}>
                        <Text
                          as="label"
                          htmlFor="import-workspace-name"
                          fontSize="sm"
                          display="block"
                          mb={2}
                        >
                          Workspace name
                        </Text>
                        <Input
                          id="import-workspace-name"
                          aria-label="Imported workspace name"
                          value={newName}
                          maxLength={60}
                          size="md"
                          borderRadius="lg"
                          isDisabled={importing}
                          onChange={(event) => {
                            setNewName(event.target.value);
                            setError("");
                          }}
                        />
                      </Box>
                    )}
                  </Box>
                )}
                {stage === "Setup" && backup.compilerSettings && (
                  <Box>
                    <Box>
                      <Text fontSize="sm" mb={2}>
                        Entry file
                      </Text>
                      <DarkSelect
                        ariaLabel="Imported entry file"
                        options={backup.files.map((file) => ({
                          label: file.name,
                          value: file.name,
                        }))}
                        selectedOption={{
                          label: backup.activeFile!,
                          value: backup.activeFile!,
                        }}
                        setSelectedOption={(option) => {
                          if (!option) return;
                          const selected = {
                            ...backup,
                            activeFile: String(option.value),
                            openFiles: [String(option.value)],
                          };
                          setBackup(selected);
                          setError("");
                          void detectVersion(selected);
                        }}
                      />
                    </Box>
                    <Box mt={5}>
                      <HStack
                        justify="space-between"
                        align="center"
                        spacing={2}
                      >
                        <HStack spacing={2}>
                          <Text fontSize="xs" color="text.secondary">
                            Compiler settings
                          </Text>
                          {detectingVersion && <Spinner size="xs" />}
                        </HStack>
                        <CompilerConfiguration
                          settings={backup.compilerSettings}
                          disabled={disabled}
                          onChange={(compilerSettings) => {
                            versionRequest.current++;
                            setDetectingVersion(false);
                            setVersionError("");
                            setError("");
                            setBackup((current) =>
                              current
                                ? { ...current, compilerSettings }
                                : current
                            );
                          }}
                        />
                      </HStack>
                      {versionError && (
                        <Text fontSize="xs" color="warning.text" mt={2}>
                          {versionError}
                        </Text>
                      )}
                    </Box>
                  </Box>
                )}
                {stage === "Review" && (
                  <>
                    <Box as="dl" fontSize="sm" mb={4}>
                      <HStack justify="space-between" py={2}>
                        <Text as="dt" color="text.secondary">
                          Files
                        </Text>
                        <Text as="dd">{backup.files.length}</Text>
                      </HStack>
                      <HStack justify="space-between" py={2}>
                        <Text as="dt" color="text.secondary">
                          Mode
                        </Text>
                        <Text as="dd">
                          {mode === "add" ? "Add files" : "New workspace"}
                        </Text>
                      </HStack>
                      {mode === "new" && (
                        <HStack
                          justify="space-between"
                          align="start"
                          gap={4}
                          py={2}
                        >
                          <Text as="dt" color="text.secondary">
                            Workspace
                          </Text>
                          <Text
                            as="dd"
                            textAlign="right"
                            overflowWrap="anywhere"
                            minW={0}
                          >
                            {newName}
                          </Text>
                        </HStack>
                      )}
                      {mode === "new" && backup.compilerSettings && (
                        <>
                          <HStack justify="space-between" py={2}>
                            <Text as="dt" color="text.secondary">
                              Compiler
                            </Text>
                            <Text as="dd">
                              solc{" "}
                              {compilerVersion(backup.compilerSettings.version)}
                            </Text>
                          </HStack>
                          {isJson && (
                            <Box py={2}>
                              <Text as="dt" color="text.secondary" mb={1}>
                                Entry file
                              </Text>
                              <Text
                                as="dd"
                                fontFamily="mono"
                                fontSize="xs"
                                overflowWrap="anywhere"
                              >
                                {backup.activeFile}
                              </Text>
                            </Box>
                          )}
                        </>
                      )}
                    </Box>
                    {mode === "add" && (
                      <Text fontSize="xs" color="text.secondary" mb={3}>
                        {renamed
                          ? `${renamed} ${renamed === 1 ? "path" : "paths"} renamed. `
                          : ""}
                        Compiler settings unchanged.
                      </Text>
                    )}
                    <Box
                      as="details"
                      borderTopWidth="1px"
                      borderColor="border.default"
                    >
                      <Text as="summary" cursor="pointer" fontSize="sm" py={2}>
                        {backup.files.length}{" "}
                        {backup.files.length === 1 ? "file" : "files"}
                      </Text>
                      <Box
                        maxH="220px"
                        overflowY="auto"
                        fontFamily="mono"
                        fontSize="xs"
                        borderTopWidth="1px"
                        borderColor="border.default"
                        py={2}
                      >
                        {preview.map((file) => (
                          <Text
                            key={file.originalName}
                            py={1}
                            overflowWrap="anywhere"
                          >
                            {file.originalName}
                            {file.name !== file.originalName
                              ? ` → ${file.name}`
                              : ""}
                          </Text>
                        ))}
                      </Box>
                    </Box>
                  </>
                )}
              </Box>
            )}
          </ModalBody>
          <ModalFooter gap={2} flexWrap="wrap" flexShrink={0}>
            <Button
              size="sm"
              mr="auto"
              leftIcon={<X size={14} />}
              onClick={() => setIsOpen(false)}
              isDisabled={reading || importing}
            >
              Cancel
            </Button>
            {backup && step > 0 && (
              <Button
                size="sm"
                leftIcon={<ArrowLeft size={14} />}
                isDisabled={importing}
                onClick={() => {
                  setStep((current) => current - 1);
                  setError("");
                }}
              >
                Back
              </Button>
            )}
            {error && !backup ? (
              <Button
                size="sm"
                leftIcon={<Upload size={14} />}
                onClick={() => (isJson ? jsonPicker : picker).current?.click()}
              >
                Choose another {isJson ? "JSON" : "ZIP"}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="primary"
                leftIcon={
                  stage === "Review" ? (
                    mode === "new" ? (
                      <FolderPlus size={14} />
                    ) : (
                      <Upload size={14} />
                    )
                  ) : undefined
                }
                rightIcon={
                  stage !== "Review" ? <ArrowRight size={14} /> : undefined
                }
                onClick={stage === "Review" ? () => void apply() : next}
                isLoading={importing}
                loadingText="Importing…"
                isDisabled={
                  !backup ||
                  reading ||
                  disabled ||
                  exporting ||
                  importing ||
                  (stage === "Setup" && detectingVersion)
                }
              >
                {stage === "Review"
                  ? mode === "new"
                    ? "Create workspace"
                    : "Add files"
                  : "Continue"}
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
