"use client";
import { flashSourceLine } from "@/components/SourceCodeExplorer/flashSourceLine";
import { CompilationErrors } from "./CompilationErrors";
import { WorkspaceDependencies } from "./WorkspaceDependencies";
import { bindWorkspaceEditor, updateEditorFile, workspaceModelPath, type WorkspaceEditorContext } from "./workspaceEditorBinding";
import { lockedPath } from "@/lib/solidity/dependencies";
import { registerSelectorLenses } from "@/components/SourceCodeExplorer/selectorLenses";

import { useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import {
  Box,
  Checkbox,
  Button,
  Flex,
  Heading,
  HStack,
  IconButton,
  Text,
  Tabs,
  TabList,
  Tab,
  Spinner,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from "@chakra-ui/react";
import {
  Braces,
  CheckCircle2,
  CircleAlert,
  Download,
  PanelLeftOpen,
  Play,
} from "lucide-react";
import { CopyToClipboard } from "@/components/CopyToClipboard";
import { DarkSelect } from "@/components/DarkSelect";
import { ConnectButton } from "@/components/ConnectButton";
import { PaneResizeHandle } from "./PaneResizeHandle";
import { OutputResizeHandle } from "./OutputResizeHandle";
import { DeploymentHistory } from "./DeploymentHistory";
import { useDeploymentHistory } from "./useDeploymentHistory";
import { ContractDeployment } from "./ContractDeployment";
import { useLocalWorkspace } from "./useLocalWorkspace";
import { BuildDownloads } from "./BuildDownloads";
import { CompilerConfiguration } from "./CompilerConfiguration";
import { normalizeCompilerSettings } from "@/lib/solidity/settings";
import { useSolidityCompiler } from "./useSolidityCompiler";
import { syncDiagnosticMarkers } from "./diagnosticMarkers";
import { registerSolidityIntellisense } from "./intellisense";
import { WorkspaceBackupActions } from "./WorkspaceBackup";
import { WorkspaceSelector } from "./WorkspaceSelector";
import {
  WorkspaceFiles,
  selectWorkspaceFile,
  closeWorkspaceFile,
} from "./WorkspaceFiles";
import { CodeEditorTabs } from "@/components/SourceCodeExplorer/CodeEditorTabs";
import { diagnosticPosition } from "@/lib/solidity/compilation";
import type { CompilerError } from "./types";
import type { OnMount } from "@monaco-editor/react";

const INITIAL_CODE = `// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract Counter {
    uint256 public number;

    function increment() public {
        ++number;
    }
}`;
const ARTIFACTS = ["ABI", "Bytecode", "Runtime"] as const;

function downloadFile(name: string, content: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function SolidityIDE() {
  const local = useLocalWorkspace(INITIAL_CODE);
  const deploymentHistory = useDeploymentHistory(local.activeWorkspace?.id);
  const activeFile = local.workspace?.files.find(
    (file) => file.id === local.workspace?.activeFileId
  );
  const [dependencyRequest, setDependencyRequest] = useState<{name: string; nonce: number; workspaceId?: string; remove?: boolean; source?: "npm" | "github"} | undefined>();
  const openDependencyRef = useRef<(name: string, remove?: boolean, source?: "npm" | "github") => void>(() => {});
  const [explorerReveal, setExplorerReveal] = useState<{id:string;nonce:number}>();
  const code = activeFile?.content ?? "";
  const filesPaneRef = useRef<HTMLDivElement>(null);
  const panesRef = useRef<HTMLDivElement>(null);
  const editorPaneRef = useRef<HTMLDivElement>(null);
  const outputPaneRef = useRef<HTMLDivElement>(null);
  const filesDrawer = useDisclosure();
  const reloadDialog = useDisclosure();
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const [jump, setJump] = useState<{
    id: string;
    lineNumber: number;
    column: number;
  } | null>(null);
  const languageRef = useRef<ReturnType<
    typeof registerSolidityIntellisense
  > | null>(null);
  const workspaceRef = useRef(local.workspace);
  workspaceRef.current = local.workspace;
  const openSourceRef = useRef(
    (id: string, point: { lineNumber: number; column: number }) => {}
  );
  openSourceRef.current = (id, point) => {
    if (local.isChanging || deploymentBusy) return;
    local.update((current) => selectWorkspaceFile(current, id));
    setJump({ id, ...point });
  };
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);
  const selectorLensesRef = useRef<ReturnType<typeof registerSelectorLenses> | null>(null);
  const [contractChoice, setContractName] = useState("");
  const [artifact, setArtifact] = useState(0);
  const [artifactOpen, setArtifactOpen] = useState(false);
  const [deploymentBusy, setDeploymentBusy] = useState(false);
  const [autoCompile, setAutoCompile] = useState(true);
  const [editorMount, setEditorMount] = useState(0);
  const compiler = useSolidityCompiler({
    workspaceId: local.activeWorkspace?.id,
    workspace: local.workspace,
    paused: deploymentBusy || (deploymentHistory.hasUnsaved && !!deploymentHistory.error) || local.isChanging || local.status === "loading",
    autoCompile,
  });
  const {
    state: compilerState,
    error: compilerError,
    isCompiling,
    result,
    compiledSource,
    compiledFileName,
    stale,
  } = compiler;
  const compile = () => {
    setArtifactOpen(false);
    compiler.compile();
  };
  const contracts = useMemo(() => {
    const outputs = result?.contracts ?? {};
    const names = Object.keys(outputs);
    const workspace = local.workspace;
    if (!workspace) return names;
    return names.sort((a, b) =>
      Number(lockedPath(workspace, outputs[a].sourcePath)) -
      Number(lockedPath(workspace, outputs[b].sourcePath))
    );
  }, [result?.contracts, local.workspace?.dependencies]);
  const contractName = contracts.includes(contractChoice)
    ? contractChoice
    : (contracts.find(
        (key) => result!.contracts![key].sourcePath === compiledFileName
      ) ??
      contracts[0] ??
      "");
  const selectedContract = result?.contracts?.[contractName];
  useEffect(() => {
    if (monacoRef.current)
      syncDiagnosticMarkers(
        monacoRef.current,
        local.workspace,
        compiler.diagnosticBuild
      );
  }, [compiler.diagnosticBuild, local.workspace?.activeFileId, editorMount]);
  const output = useMemo(
    () =>
      selectedContract
        ? artifact === 0
          ? JSON.stringify(selectedContract.abi, null, 2)
          : `0x${artifact === 1 ? selectedContract.bytecode : selectedContract.deployedBytecode}`
        : "",
    [selectedContract, artifact]
  );
  const outputName =
    artifact === 0
      ? `${selectedContract?.name}.abi.json`
      : `${selectedContract?.name}.${artifact === 1 ? "bytecode" : "runtime"}.txt`;

  const filesLocked =
    deploymentBusy || (deploymentHistory.hasUnsaved && !!deploymentHistory.error) || local.isChanging || local.status === "loading";
  const editorContext = useRef<WorkspaceEditorContext>({workspace:null, blocked:true});
  editorContext.current = {workspace:local.workspace, workspaceId:local.activeWorkspace?.id, blocked:filesLocked};
  const editorBinding = useRef<ReturnType<typeof bindWorkspaceEditor> | null>(null);
  useEffect(() => {
    if (!editorRef.current) return;
    const binding = bindWorkspaceEditor(editorRef.current, () => editorContext.current,
      (workspaceId, fileId, content) => local.update(
        current => updateEditorFile(current, fileId, content), workspaceId));
    editorBinding.current = binding;
    binding.sync();
    return () => { binding.dispose(); if (editorBinding.current === binding) editorBinding.current = null; };
  }, [editorMount, local.update]);
  useEffect(() => { editorBinding.current?.sync(); }, [local.workspace, editorMount]);
  useEffect(() => {
    if (!monacoRef.current) return;
    const registration = registerSolidityIntellisense(monacoRef.current,
      () => workspaceRef.current, (id, point) => openSourceRef.current(id, point));
    languageRef.current = registration;
    return () => { registration.dispose(); if (languageRef.current === registration) languageRef.current = null; };
  }, [editorMount]);
  openDependencyRef.current = (name, remove = false, source) => {
    if (filesLocked) return;
    filesDrawer.onClose();
    setDependencyRequest({name, remove, source, nonce: Date.now(), workspaceId: local.activeWorkspace?.id});
  };
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const registration = registerSelectorLenses(editor, monaco, {
      getWorkspace: () => workspaceRef.current,
      onInstall: (name, source) => openDependencyRef.current(name, false, source),
      onOpenImport: id => {
        setExplorerReveal(previous => ({id,nonce:(previous?.nonce ?? 0)+1}));
        openSourceRef.current(id, {lineNumber:1,column:1});
      },
    });
    selectorLensesRef.current = registration;
    return () => {
      registration.dispose();
      if (selectorLensesRef.current === registration) selectorLensesRef.current = null;
    };
  }, [editorMount, registerSelectorLenses]);
  useEffect(() => {
    selectorLensesRef.current?.refreshContext();
  }, [local.workspace]);
  useEffect(() => {
    const openIds = new Set(local.workspace?.openFileIds ?? []);
    for (const model of monacoRef.current?.editor.getModels() ?? []) {
      if (
        model.uri.scheme === "ethsh-solidity" &&
        !openIds.has(model.uri.path.slice(1))
      )
        model.dispose();
    }
  }, [local.workspace?.openFileIds]);
  // Fast Refresh can replay effects without unmounting Monaco. Defer model cleanup
  // so a matching setup can cancel it; real page unmount still releases models.
  const modelCleanup = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    clearTimeout(modelCleanup.current);
    return () => {
      const monaco = monacoRef.current;
      modelCleanup.current = setTimeout(() => {
        for (const model of monaco?.editor.getModels() ?? [])
          if (model.uri.scheme === "ethsh-solidity") model.dispose();
      }, 0);
    };
  }, []);

  useEffect(() => {
    if (!jump || activeFile?.id !== jump.id || !editorRef.current) return;
    const editor = editorRef.current;
    const timer = setTimeout(() => {
      editor.setPosition(jump);
      editor.revealPositionInCenter(jump);
      flashSourceLine(editor, jump.lineNumber);
      editor.focus();
      setJump(null);
    }, 50);
    return () => clearTimeout(timer);
  }, [jump, activeFile?.id]);
  const jumpToDiagnostic = (diagnostic: CompilerError) => {
    const location = diagnostic.sourceLocation;
    const file = local.workspace?.files.find(
      (file) => file.name === location?.file
    );
    if (!location || !file || filesLocked) return;
    local.update((current) => selectWorkspaceFile(current, file.id));
    setJump({
      id: file.id,
      ...diagnosticPosition(file.content, Math.max(0, location.start)),
    });
  };

  return (
    <Box
      as="main"
      w="full"
      maxW="1600px"
      mx="auto"
      px={{ base: 4, md: 6, xl: 10 }}
      py={{ base: 6, md: 8 }}
      minW={0}
    >
      <Flex
        mb={6}
        gap={4}
        justify="space-between"
        align={{ base: "start", sm: "center" }}
        wrap="wrap"
      >
        <Box>
          <Heading
            as="h1"
            fontSize={{ base: "24px", md: "32px" }}
            fontWeight="600"
            letterSpacing="tight"
          >
            Solidity Compiler
          </Heading>
          <Text mt={2} color="text.secondary" fontSize="md">
            Compile Solidity to ABI and bytecode in your browser.
          </Text>
        </Box>
        <Box
          display="flex"
          flexDirection="column"
          gap={3}
          alignItems={{ base: "flex-start", sm: "flex-end" }}
          maxW="full"
        >
          <ConnectButton />
        </Box>
      </Flex>

      {local.error && (
        <Flex
          role="alert"
          mb={4}
          p={3}
          gap={3}
          align="center"
          wrap="wrap"
          bg="error.bg"
          rounded="lg"
        >
          <CircleAlert size={18} />
          <Text flex="1" minW="180px" fontSize="sm">
            {local.error} Your open file can still be downloaded.
          </Text>
          {local.workspace && (
            <>
              <Button
                size="sm"
                onClick={() =>
                  downloadFile(
                    "solidity-workspace.json",
                    JSON.stringify(local.workspace, null, 2),
                    "application/json"
                  )
                }
              >
                Download unsaved files
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  local.hasConflict ? reloadDialog.onOpen() : void local.flush()
                }
              >
                {local.hasConflict ? "Reload saved files" : "Retry save"}
              </Button>
            </>
          )}
          {!local.workspace && (
            <Button size="sm" onClick={() => void local.reload()}>
              Retry loading
            </Button>
          )}
        </Flex>
      )}
      {compilerState === "failed" && (
        <Flex
          role="alert"
          mb={4}
          p={3}
          gap={3}
          align="center"
          wrap="wrap"
          bg="error.bg"
          border="1px solid"
          borderColor="error.border"
          rounded="lg"
        >
          <CircleAlert size={18} />
          <Text flex="1" minW="180px" fontSize="sm">
            {compilerError}
          </Text>
          <Button size="sm" onClick={compiler.reload}>
            Reload compiler
          </Button>
        </Flex>
      )}

      <Modal
        isOpen={reloadDialog.isOpen}
        onClose={reloadDialog.onClose}
        isCentered
      >
        <ModalOverlay />
        <ModalContent mx={4} bg="bg.muted">
          <ModalHeader fontSize="lg">Reload saved files?</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text fontSize="sm">
              Unsaved changes in this tab will be discarded. You can download
              them before reloading.
            </Text>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button size="sm" onClick={reloadDialog.onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                reloadDialog.onClose();
                void local.reload();
              }}
            >
              Reload saved files
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Box minW={0}>
        <Flex
          px={0}
          py={3}
          gap={3}
          justify="space-between"
          align="center"
          borderBottom="1px solid"
          borderColor="border.default"
          wrap="wrap"
        >
          <HStack spacing={2} minW={0}>
            <IconButton
              display={{ base: "inline-flex", xl: "none" }}
              aria-label="Open workspace files"
              title="Open files sidebar"
              aria-expanded={filesDrawer.isOpen}
              icon={<PanelLeftOpen size={18} />}
              variant="ghost"
              size="sm"
              onClick={filesDrawer.onOpen}
            />
            <WorkspaceBackupActions
              key={local.activeWorkspace?.id ?? "loading"}
              workspace={local.workspace}
              workspaceName={local.activeWorkspace?.name ?? "Workspace"}
              workspaceNames={local.workspaces.map((entry) => entry.name)}
              onCreate={local.importWorkspace}
              update={(edit) => local.update(edit, local.activeWorkspace?.id)}
              disabled={
                deploymentBusy || (deploymentHistory.hasUnsaved && !!deploymentHistory.error) || local.isChanging || local.status === "loading"
              }
              onOpen={filesDrawer.onClose}
            >
              {(importExportActions) => (
                <WorkspaceSelector
                  importExportActions={importExportActions}
                  workspaces={local.workspaces}
                  active={local.activeWorkspace}
                  fileCount={local.workspace?.files.length ?? 0}
                  disabled={deploymentBusy || (deploymentHistory.hasUnsaved && !!deploymentHistory.error) || local.status === "loading"}
                  busy={local.isChanging}
                  onSwitch={local.switchWorkspace}
                  onCreate={local.addWorkspace}
                  onRename={local.changeName}
                  onDelete={local.removeWorkspace}
                />
              )}
            </WorkspaceBackupActions>
          </HStack>
          <HStack spacing={3} flexWrap="wrap" rowGap={2}>
            <CompilerConfiguration
              settings={
                local.workspace?.compilerSettings ?? normalizeCompilerSettings()
              }
              disabled={deploymentBusy || (deploymentHistory.hasUnsaved && !!deploymentHistory.error) || local.isChanging || !local.workspace}
              onChange={(compilerSettings) =>
                local.update((current) => ({ ...current, compilerSettings }))
              }
            />
            <Checkbox
              size="sm"
              isChecked={autoCompile}
              onChange={(event) => setAutoCompile(event.target.checked)}
              isDisabled={deploymentBusy}
            >
              <Text fontSize="xs" color="text.secondary">
                Auto-compile
              </Text>
            </Checkbox>
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Play size={14} fill="currentColor" />}
              onClick={compile}
              isLoading={isCompiling || compilerState === "loading"}
              loadingText={isCompiling ? "Compiling…" : "Loading compiler…"}
              isDisabled={
                deploymentBusy ||
                local.isChanging ||
                local.status === "loading" ||
                !activeFile ||
                compilerState !== "ready" ||
                !code.trim()
              }
            >
              Compile
            </Button>
          </HStack>
        </Flex>

        <Flex
          ref={panesRef}
          direction={{ base: "column", lg: "row" }}
          align="stretch"
        >
          <WorkspaceFiles
            paneRef={filesPaneRef}
            key={local.activeWorkspace?.id ?? "loading"}
            workspace={local.workspace}
            update={(edit) => local.update(edit, local.activeWorkspace?.id)}
            disabled={filesLocked}
            isOpen={filesDrawer.isOpen}
            onClose={filesDrawer.onClose}
            revealFile={explorerReveal}
            onOpenDependencies={(name = "", remove = false) => openDependencyRef.current(name, remove)}
            onRevealFile={(id, lineNumber) =>
              setJump({ id, lineNumber, column: 1 })
            }
          />
          <PaneResizeHandle
            container={panesRef}
            editor={editorPaneRef}
            pane={filesPaneRef}
            property="--solidity-explorer-width"
            label="Resize file explorer"
            controls="solidity-files-panel"
            edge="right"
            minimum={220}
            maximum={480}
            initial={240}
            breakpoint="xl"
          />
          <Box
            ref={editorPaneRef}
            flex={{ lg: "1 1 0%" }}
            minW={0}
            display="flex"
            flexDirection="column"
          >
            <CodeEditorTabs
              tabs={(local.workspace?.openFileIds ?? []).flatMap((id) => {
                const file = local.workspace?.files.find(
                  (item) => item.id === id
                );
                return file
                  ? [
                      {
                        id,
                        name: file.name.split("/").at(-1)!,
                        path: file.name,
                        content: file.content,
                      },
                    ]
                  : [];
              })}
              activeTabId={activeFile?.id ?? ""}
              onTabSelect={(id) => {
                if (!filesLocked)
                  local.update((current) => selectWorkspaceFile(current, id));
              }}
              onTabClose={(id) => {
                if (!filesLocked)
                  local.update((current) => closeWorkspaceFile(current, id));
              }}
            />
            <Box
              h={{ base: "600px", md: "760px", lg: "min(95vh, 1200px)" }}
              minH={{ lg: "680px" }}
              flex={{ lg: 1 }}
              bg="#1e1e1e"
            >
              {activeFile ? (
                <Editor
                  height="100%"
                  path={workspaceModelPath(activeFile.id)}
                  keepCurrentModel
                  saveViewState
                  onMount={(editor, monaco) => {
                    editorRef.current = editor;
                    monacoRef.current = monaco;
                    setEditorMount((value) => value + 1);
                  }}
                  defaultLanguage="sol"
                  theme="vs-dark"
                  defaultValue={code}
                  loading={
                    <HStack h="full" justify="center" color="text.secondary">
                      <Spinner size="sm" />
                      <Text fontSize="sm">Loading editor…</Text>
                    </HStack>
                  }
                  options={{
                    readOnly: filesLocked || !!(local.workspace && activeFile && lockedPath(local.workspace, activeFile.name)),
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineHeight: 22,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    padding: { top: 16, bottom: 16 },
                    wordWrap: "on",
                    tabSize: 4,
                    quickSuggestions: {
                      other: true,
                      comments: false,
                      strings: true,
                    },
                    suggestOnTriggerCharacters: true,
                    parameterHints: { enabled: true },
                    renderValidationDecorations: "on",
                    wordBasedSuggestions: "off",
                    tabCompletion: "on",
                    lineNumbersMinChars: 3,
                    overviewRulerLanes: 0,
                    hideCursorInOverviewRuler: true,
                    ariaLabel: "Solidity source code",
                  }}
                />
              ) : (
                <Flex h="full" align="center" justify="center">
                  <Text color="text.secondary" fontSize="sm">
                    {local.status === "loading"
                      ? "Loading files…"
                      : "Open a file to start editing."}
                  </Text>
                </Flex>
              )}
            </Box>
          </Box>

          <OutputResizeHandle
            container={panesRef}
            editor={editorPaneRef}
            output={outputPaneRef}
          />
          <Box
            id="solidity-output-panel"
            ref={outputPaneRef}
            flex={{ lg: "0 0 auto" }}
            w={{
              lg: "var(--solidity-output-width, 300px)",
              "2xl": "var(--solidity-output-width, 340px)",
            }}
            minW={0}
            borderTopWidth={{ base: "1px", lg: 0 }}
            borderColor="border.default"
          >
            <Flex
              px={4}
              py={3}
              minH="53px"
              borderBottom="1px solid"
              borderColor="border.default"
              align="center"
              justify="space-between"
              gap={3}
              wrap="wrap"
            >
              <HStack spacing={2}>
                <Heading as="h2" fontSize="md" fontWeight="600">
                  Output
                </Heading>
                {compiler.build && <BuildDownloads build={compiler.build} />}
              </HStack>
              {result && (
                <HStack
                  spacing={1.5}
                  fontSize="sm"
                  color={
                    stale
                      ? "warning.text"
                      : result.error
                        ? "error.text"
                        : "success.text"
                  }
                >
                  {stale || result.error ? (
                    <CircleAlert size={14} />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  <Text>
                    {stale
                      ? "Source changed"
                      : result.error
                        ? "Compilation failed"
                        : "Compiled"}
                  </Text>
                </HStack>
              )}
            </Flex>

            {!result ? (
              <Flex
                minH={{ base: "180px", lg: deploymentHistory.records.length ? "140px" : "420px" }}
                direction="column"
                align="center"
                justify="center"
                gap={3}
                px={6}
                color="text.secondary"
              >
                <Braces size={24} strokeWidth={1.5} />
                <Text fontSize="sm" textAlign="center">
                  Compile to view ABI and bytecode.
                </Text>
              </Flex>
            ) : result.error ? (
              <CompilationErrors
                diagnostics={result.diagnostics}
                fallback={result.error}
                files={local.workspace?.files ?? []}
                disabled={filesLocked}
                onSelect={jumpToDiagnostic}
              />
            ) : (
              <Box p={4}>
                {contracts.length > 0 ? (
                  <>
                    <Box mb={4}>
                      {contracts.length > 1 ? (
                        <DarkSelect
                          ariaLabel="Compiled contract"
                          isDisabled={deploymentBusy}
                          size="sm"
                          options={contracts.map((name) => ({
                            label: name,
                            value: name,
                          }))}
                          selectedOption={{
                            label: contractName,
                            value: contractName,
                          }}
                          setSelectedOption={(option) =>
                            option && setContractName(String(option.value))
                          }
                        />
                      ) : (
                        <Text
                          fontSize="md"
                          fontWeight="500"
                          fontFamily="mono"
                          overflowWrap="anywhere"
                        >
                          {contractName}
                        </Text>
                      )}
                    </Box>
                    <Accordion
                      allowToggle
                      index={artifactOpen ? 0 : -1}
                      onChange={(index) => setArtifactOpen(index === 0)}
                      reduceMotion
                    >
                      <AccordionItem border="0">
                        <AccordionButton
                          px={0}
                          py={2}
                          justifyContent="space-between"
                          fontSize="sm"
                          color="text.secondary"
                          _hover={{ color: "text.primary", bg: "transparent" }}
                        >
                          <HStack spacing={2}>
                            <Braces size={15} />
                            <Text>ABI &amp; bytecode</Text>
                          </HStack>
                          <AccordionIcon />
                        </AccordionButton>
                        <AccordionPanel px={0} pt={3} pb={0}>
                          {artifactOpen && (
                            <>
                              <Flex
                                justify="space-between"
                                align="center"
                                gap={2}
                                mb={3}
                              >
                                <Tabs
                                  index={artifact}
                                  onChange={setArtifact}
                                  variant="line"
                                  size="sm"
                                  minW={0}
                                >
                                  <TabList>
                                    {ARTIFACTS.map((label) => (
                                      <Tab
                                        key={label}
                                        px={{ base: 2, sm: 3 }}
                                        fontSize="sm"
                                      >
                                        {label}
                                      </Tab>
                                    ))}
                                  </TabList>
                                </Tabs>
                                <HStack spacing={0} flexShrink={0}>
                                  <CopyToClipboard
                                    aria-label={`Copy ${ARTIFACTS[artifact]}`}
                                    textToCopy={output}
                                    size="sm"
                                  />
                                  <IconButton
                                    aria-label={`Download ${ARTIFACTS[artifact]}`}
                                    icon={<Download size={15} />}
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      downloadFile(
                                        outputName,
                                        output,
                                        artifact === 0
                                          ? "application/json"
                                          : "text/plain"
                                      )
                                    }
                                  />
                                </HStack>
                              </Flex>
                              <Box
                                border="1px solid"
                                borderColor="border.default"
                                rounded="md"
                                overflow="hidden"
                              >
                                <Editor
                                  height="260px"
                                  language={
                                    artifact === 0 ? "json" : "plaintext"
                                  }
                                  theme="vs-dark"
                                  value={output}
                                  options={{
                                    readOnly: true,
                                    domReadOnly: true,
                                    minimap: { enabled: false },
                                    automaticLayout: true,
                                    fontSize: 12,
                                    lineHeight: 20,
                                    scrollBeyondLastLine: false,
                                    wordWrap: "on",
                                    lineNumbers: "off",
                                    folding: artifact === 0,
                                    padding: { top: 12, bottom: 12 },
                                    overviewRulerLanes: 0,
                                    ariaLabel: `Compiled ${ARTIFACTS[artifact]}`,
                                  }}
                                />
                              </Box>
                              {artifact !== 0 && (
                                <Text
                                  mt={2}
                                  fontSize="xs"
                                  color="text.secondary"
                                >
                                  {(output.length - 2) / 2} bytes
                                  {artifact === 2
                                    ? " · Deployed code"
                                    : " · Creation code"}
                                </Text>
                              )}
                            </>
                          )}
                        </AccordionPanel>
                      </AccordionItem>
                    </Accordion>
                    <ContractDeployment
                      key={`${compiledFileName}:${compiledSource}:${contractName}`}
                      contract={selectedContract!}
                      build={compiler.build ?? undefined}
                      history={deploymentHistory}
                      contractName={selectedContract!.name}
                      isStale={stale || isCompiling}
                      onBusyChange={setDeploymentBusy}
                    />
                  </>
                ) : (
                  <Text fontSize="sm" color="text.secondary">
                    No contracts in this source.
                  </Text>
                )}
              </Box>
            )}
            <DeploymentHistory history={deploymentHistory} />
            {!!result?.warnings?.length && (
              <Box
                mx={4}
                mb={4}
                as="details"
                color="warning.text"
                fontSize="sm"
              >
                <Box as="summary" cursor="pointer" py={2}>
                  {result.warnings.length}{" "}
                  {result.warnings.length === 1 ? "warning" : "warnings"}
                </Box>
                {result.warnings.map((warning, index) => (
                  <Box
                    key={index}
                    as="pre"
                    mt={2}
                    fontFamily="mono"
                    fontSize="xs"
                    whiteSpace="pre-wrap"
                    overflowWrap="anywhere"
                  >
                    {warning.formattedMessage}
                    {warning.sourceLocation && (
                      <Button
                        display="block"
                        mt={1}
                        size="xs"
                        variant="ghost"
                        whiteSpace="normal"
                        h="auto"
                        py={2}
                        maxW="full"
                        isDisabled={filesLocked}
                        onClick={() => jumpToDiagnostic(warning)}
                      >
                        Open {warning.sourceLocation.file}
                      </Button>
                    )}
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Flex>
      </Box>
      <WorkspaceDependencies
        key={local.activeWorkspace?.id ?? "dependencies-loading"}
        workspace={local.workspace}
        update={edit => local.update(edit, local.activeWorkspace?.id)}
        disabled={filesLocked}
        showTrigger={false}
        onClose={() => setDependencyRequest(undefined)}
        request={dependencyRequest?.workspaceId === local.activeWorkspace?.id ? dependencyRequest : undefined}
      />
    </Box>
  );
}
