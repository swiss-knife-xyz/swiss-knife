"use client";
import { DependencyFolderActions } from "./DependencyFolderActions";
import { assertEditablePath, lockedPath } from "@/lib/solidity/dependencies";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  HStack,
  IconButton,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuDivider,
  MenuList,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  useToast,
  type ToastId,
} from "@chakra-ui/react";
import {
  ArrowLeft,
  History,
  Download,
  Package,
  FolderPlus,
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
  Search,
} from "lucide-react";
import { FileExplorerPanel } from "@/components/SourceCodeExplorer/FileExplorerPanel";
import { Toast } from "@/components/Toast";
import { ReplacePreview } from "./ReplacePreview";
import {
  applyReplacements,
  canApplyReplacements,
  planReplacements,
  type ReplacementPlan,
} from "@/lib/solidity/workspaceSearch";
import type { SearchDraft } from "@/components/SourceCodeExplorer/SearchPanel";
import { SearchPanel } from "@/components/SourceCodeExplorer/SearchPanel";
import { buildFileTree } from "@/components/SourceCodeExplorer/utils";
import {
  addFolder,
  assertPaths,
  baseName,
  insideFolder,
  moveFolder,
  parentPath,
  removeFolder,
  workspaceFolders,
} from "@/lib/solidity/paths";
import {
  validateFileName,
  type SolidityFile,
  type SolidityWorkspace,
} from "@/lib/solidity/workspace";

type Props = {
  paneRef?: RefObject<HTMLDivElement | null>;
  workspace: SolidityWorkspace | null;
  update(edit: (workspace: SolidityWorkspace) => SolidityWorkspace, reason?: string): void;
  onOpenHistory?(fileId: string): void;
  disabled: boolean;
  isOpen: boolean;
  onClose(): void;
  onOpen?(): void;
  onRevealFile?(id: string, lineNumber: number): void;
  revealFile?: { id: string; nonce: number };
  onOpenDependencies?(name?: string, remove?: boolean): void;
};
export function selectWorkspaceFile(
  workspace: SolidityWorkspace,
  id: string
): SolidityWorkspace {
  if (workspace.activeFileId === id) return workspace;
  return {
    ...workspace,
    activeFileId: id,
    openFileIds: workspace.openFileIds.includes(id)
      ? workspace.openFileIds
      : [...workspace.openFileIds, id],
  };
}
export function closeWorkspaceFile(
  workspace: SolidityWorkspace,
  id: string
): SolidityWorkspace {
  const index = workspace.openFileIds.indexOf(id);
  const openFileIds = workspace.openFileIds.filter((openId) => openId !== id);
  return {
    ...workspace,
    openFileIds,
    activeFileId:
      workspace.activeFileId === id
        ? (openFileIds[Math.max(0, index - 1)] ?? null)
        : workspace.activeFileId,
  };
}

function initialCollapsedFolders(workspace: SolidityWorkspace | null) {
  const selected = workspace?.files.find(
    (file) => file.id === workspace.activeFileId
  )?.name;
  return new Set(
    workspace
      ? workspaceFolders(workspace).filter(
          (folder) => !selected || !insideFolder(selected, folder)
        )
      : []
  );
}

export function WorkspaceFiles({
  workspace,
  update,
  disabled,
  isOpen,
  onClose,
  onOpenHistory,
  onOpen,
  onRevealFile,
  revealFile,
  onOpenDependencies,
  paneRef,
}: Props) {
  const [dialog, setDialog] = useState<{
    type:
      | "new"
      | "rename"
      | "delete"
      | "newFolder"
      | "renameFolder"
      | "deleteFolder";
    folder?: string;
    file?: SolidityFile;
  } | null>(null);
  const [collapsed, setCollapsed] = useState(() =>
    initialCollapsedFolders(workspace)
  );
  const knownFolders = useRef(
    new Set(workspace ? workspaceFolders(workspace) : [])
  );
  const [selectedFolder, setSelectedFolder] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState<SearchDraft>();
  const [replacementPlan, setReplacementPlan] =
    useState<ReplacementPlan | null>(null);
  const writablePaths = useMemo(
    () =>
      new Set(
        workspace?.files
          .filter((file) => !lockedPath(workspace, file.name))
          .map((file) => file.name)
      ),
    [workspace]
  );
  const latestWorkspace = useRef(workspace);
  latestWorkspace.current = workspace;
  const previewStale =
    !!replacementPlan &&
    (!workspace || !canApplyReplacements(workspace, replacementPlan));
  const applyReplacementPlan = () => {
    const plan = replacementPlan;
    if (
      !plan ||
      !workspace ||
      disabled ||
      !canApplyReplacements(workspace, plan)
    )
      return;
    update((current) => applyReplacements(current, plan), "Before replace all");
    setReplacementPlan(null);
    const id = toast({
      duration: 12000,
      position: "bottom",
      render: ({ id, onClose }) => (
        <Toast
          id={id}
          description={`Replaced ${plan.count} matches`}
          action={
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const current = latestWorkspace.current;
                if (!current || !canApplyReplacements(current, plan, true)) {
                  toast({
                    status: "warning",
                    description:
                      "Files changed since replacement. Undo would overwrite newer edits.",
                  });
                  return;
                }
                update(
                  (value) => applyReplacements(value, plan, true),
                  "Before undo replacement",
                );
                onClose();
              }}
            >
              Undo
            </Button>
          }
        />
      ),
    });
    undoToasts.current.push(id);
  };
  const openSearchRef = useRef(onOpen);
  openSearchRef.current = onOpen;
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (
        !(event.metaKey || event.ctrlKey) ||
        !event.shiftKey ||
        event.altKey ||
        !["f", "h"].includes(event.key.toLowerCase()) ||
        document.querySelector('[role="dialog"]')
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      setSearchOpen(true);
      if (event.key.toLowerCase() === "h")
        setSearchDraft((current) => ({
          query: current?.query ?? "",
          options: current?.options ?? { caseSensitive: false, regex: false },
          replacement: current?.replacement ?? "",
          replacing: true,
        }));
      openSearchRef.current?.();
    };
    window.addEventListener("keydown", shortcut, true);
    return () => window.removeEventListener("keydown", shortcut, true);
  }, []);
  const inputRef = useRef<HTMLInputElement>(null!);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const toast = useToast();
  const undoToasts = useRef<ToastId[]>([]);
  const toastApi = useRef(toast);
  toastApi.current = toast;
  useEffect(
    () => () => {
      for (const id of undoToasts.current) toastApi.current.close(id);
    },
    []
  );
  const open = (
    type:
      | "new"
      | "rename"
      | "delete"
      | "newFolder"
      | "renameFolder"
      | "deleteFolder",
    file?: SolidityFile,
    folder = selectedFolder
  ) => {
    if (
      workspace &&
      ((file && lockedPath(workspace, file.name)) ||
        (!file && folder && lockedPath(workspace, folder, true)))
    )
      return;
    const prefix = folder ? folder + "/" : "";
    let nextName = "Contract.sol";
    for (
      let index = 2;
      workspace?.files.some(
        (item) => item.name.toLowerCase() === (prefix + nextName).toLowerCase()
      );
      index++
    )
      nextName = `Contract${index}.sol`;
    setName(
      type === "newFolder"
        ? `${folder ? folder + "/" : ""}contracts`
        : type.endsWith("Folder")
          ? folder
          : (file?.name ?? `${folder ? folder + "/" : ""}${nextName}`)
    );
    setError("");
    setDialog({ type, file, folder });
  };
  const submit = () => {
    if (disabled || !dialog || !workspace) return;
    try {
      if (dialog.file) assertEditablePath(workspace, dialog.file.name);
      if (
        dialog.folder &&
        ["renameFolder", "deleteFolder"].includes(dialog.type)
      )
        assertEditablePath(workspace, dialog.folder, true);
      if (["new", "rename", "newFolder", "renameFolder"].includes(dialog.type))
        assertEditablePath(workspace, name.trim());
      if (dialog.type === "newFolder") {
        const next = addFolder(workspace, name);
        update(() => next);
        setSelectedFolder(name.trim());
        setCollapsed(
          (current) =>
            new Set([...current].filter((path) => !name.startsWith(path + "/")))
        );
      } else if (dialog.type === "renameFolder") {
        const next = moveFolder(workspace, dialog.folder!, name);
        update(() => next);
        setSelectedFolder(name.trim());
        setCollapsed(new Set());
      } else if (dialog.type === "deleteFolder") {
        update((current) => removeFolder(current, dialog.folder!));
        setSelectedFolder("");
      } else if (dialog.type === "delete" && dialog.file) {
        const file = dialog.file;
        update((current) => ({
          ...closeWorkspaceFile(current, file.id),
          files: current.files.filter((item) => item.id !== file.id),
        }));
        const toastId = toast({
          duration: 8000,
          position: "bottom",
          render: ({ id }) => (
            <Toast
              id={id}
              description={`Deleted ${file.name}`}
              action={
                <Button
                  size="sm"
                  onClick={() => {
                    update((current) => {
                      let restoredName = file.name;
                      for (
                        let index = 2;
                        current.files.some(
                          (item) => item.name.toLowerCase() === restoredName.toLowerCase(),
                        );
                        index++
                      )
                        restoredName = file.name.replace(
                          /\.sol$/,
                          ` (restored ${index}).sol`,
                        );
                      return selectWorkspaceFile(
                        {
                          ...current,
                          files: [...current.files, { ...file, name: restoredName }],
                        },
                        file.id,
                      );
                    });
                    toast.close(toastId);
                  }}
                >
                  Undo
                </Button>
              }
            />
          ),
        });
        undoToasts.current.push(toastId);
      } else {
        const fileName = validateFileName(
          name,
          workspace.files,
          dialog.file?.id
        );
        assertPaths(
          [
            ...workspace.files.filter((file) => file.id !== dialog.file?.id),
            { name: fileName },
          ],
          workspaceFolders(workspace)
        );
        if (dialog.type === "rename") {
          update((current) => ({
            ...current,
            files: current.files.map((file) =>
              file.id === dialog.file?.id ? { ...file, name: fileName } : file
            ),
          }));
        } else {
          const id = crypto.randomUUID();
          let contractName = baseName(fileName)
            .replace(/\.sol$/, "")
            .replace(/[^A-Za-z0-9_]/g, "_");
          if (!/^[A-Za-z_]/.test(contractName))
            contractName = `Contract_${contractName}`;
          const file = {
            id,
            name: fileName,
            content: `// SPDX-License-Identifier: MIT\npragma solidity 0.8.30;\n\ncontract ${contractName} {\n\n}\n`,
          };
          update((current) =>
            selectWorkspaceFile(
              { ...current, files: [...current.files, file] },
              id
            )
          );
        }
      }
      setDialog(null);
      onClose();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Couldn't update the file."
      );
    }
  };
  const selectedPath = workspace?.files.find(
    (file) => file.id === workspace.activeFileId
  )?.name;
  // File contents do not affect the tree. Keep node identities/expansion stable
  // while editing; search reads live source only when its panel is open.
  const pathsKey = JSON.stringify(
    workspace?.files.map(({ id, name }) => [id, name]) ?? []
  );
  const foldersKey = JSON.stringify(workspace?.folders ?? []);
  const fileTree = useMemo(
    () =>
      buildFileTree(
        Object.fromEntries(
          (workspace?.files ?? []).map((file) => [file.name, ""])
        ),
        undefined,
        {
          folders: workspace?.folders,
          fileIds: Object.fromEntries(
            (workspace?.files ?? []).map((file) => [file.name, file.id])
          ),
          compactFolders: false,
          sortLast: (path) => !!workspace && lockedPath(workspace, path, true),
        }
      ),
    [pathsKey, foldersKey, workspace?.dependencies]
  );
  const sources = useMemo(
    () =>
      searchOpen
        ? Object.fromEntries(
            (workspace?.files ?? []).map((file) => [file.name, file.content])
          )
        : {},
    [searchOpen, workspace?.files]
  );
  const filesByPath = useMemo(
    () => new Map(workspace?.files.map((file) => [file.name, file])),
    [workspace?.files]
  );
  useEffect(() => {
    if (!workspace) return;
    const folders = new Set(workspaceFolders(workspace));
    const previousFolders = knownFolders.current;
    knownFolders.current = folders;
    setCollapsed((current) => {
      const next = new Set(
        [...current].filter((folder) => folders.has(folder))
      );
      for (const folder of folders) {
        if (!previousFolders.has(folder)) next.add(folder);
        if (
          (selectedPath && insideFolder(selectedPath, folder)) ||
          (!previousFolders.has(folder) &&
            (folder === selectedFolder || insideFolder(selectedFolder, folder)))
        )
          next.delete(folder);
      }
      return next.size === current.size &&
        [...next].every((folder) => current.has(folder))
        ? current
        : next;
    });
  }, [selectedPath, pathsKey, foldersKey]);
  useEffect(() => {
    const path = workspace?.files.find(
      (file) => file.id === revealFile?.id
    )?.name;
    if (!path || !revealFile) return;
    setSearchOpen(false);
    setCollapsed(
      (current) =>
        new Set([...current].filter((folder) => !insideFolder(path, folder)))
    );
  }, [revealFile?.id, revealFile?.nonce]);
  const selectFile = (path: string, lineNumber?: number) => {
    const file = filesByPath.get(path);
    if (disabled || !file) return;
    setSelectedFolder(parentPath(path));
    update((current) => selectWorkspaceFile(current, file.id));
    if (lineNumber !== undefined) onRevealFile?.(file.id, lineNumber);
    onClose();
  };
  const actions = (file?: SolidityFile, folder?: string) => (
    <Menu size="compact" placement="bottom-end" strategy="fixed">
      <MenuButton
        as={IconButton}
        aria-label={`Actions for ${file?.name ?? folder}`}
        icon={<MoreHorizontal size={14} />}
        size="xs"
        variant="ghost"
        isDisabled={disabled}
      />
      <MenuList minW="150px">
        {folder && (
          <>
            <MenuItem onClick={() => open("new", undefined, folder)}>
              New file
            </MenuItem>
            <MenuItem onClick={() => open("newFolder", undefined, folder)}>
              New folder
            </MenuItem>
          </>
        )}
        <MenuItem
          icon={<Pencil size={14} />}
          onClick={() => open(file ? "rename" : "renameFolder", file, folder)}
        >
          Rename / move
        </MenuItem>
        <MenuItem
          icon={<Trash2 size={14} />}
          onClick={() => open(file ? "delete" : "deleteFolder", file, folder)}
        >
          Delete
        </MenuItem>
        {file && (
          <>
            {onOpenHistory && <MenuItem icon={<History size={14} />} onClick={() => { onClose(); onOpenHistory(file.id); }}>Local history</MenuItem>}
            <MenuDivider />
            <MenuItem
              icon={<Download size={14} />}
              onClick={() => {
                const url = URL.createObjectURL(
                  new Blob([file.content], { type: "text/plain" })
                );
                const link = document.createElement("a");
                link.href = url;
                link.download = baseName(file.name);
                link.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              Download
            </MenuItem>
          </>
        )}
      </MenuList>
    </Menu>
  );
  const list = (inDrawer = false) => (
    <FileExplorerPanel
      background="bg.subtle"
      outlineMaxHeight={inDrawer ? undefined : "calc(45dvh - 16px)"}
      stickySections={!inDrawer}
      data={fileTree}
      title={searchOpen ? "Search" : "Explorer"}
      titleIcon={searchOpen ? <ArrowLeft size={14} /> : undefined}
      titleActionLabel={searchOpen ? "Back to Explorer" : "Select workspace root"}
      height="auto"
      selectedPath={selectedPath}
      scrollToSelection={false}
      revealSelection={
        workspace?.activeFileId === revealFile?.id
          ? revealFile?.nonce
          : undefined
      }
      outline={{
        path: selectedPath ?? "",
        content: selectedPath
          ? (filesByPath.get(selectedPath)?.content ?? "")
          : "",
        onSelect: (line) => selectedPath && selectFile(selectedPath, line),
      }}
      selectedFolderPath={selectedFolder}
      onRootSelect={() => {
        setSelectedFolder("");
        setSearchOpen(false);
      }}
      disabled={disabled}
      collapsedPaths={collapsed}
      onFolderSelect={setSelectedFolder}
      onFolderToggle={(path) =>
        setCollapsed((current) => {
          const next = new Set(current);
          if (next.has(path)) next.delete(path);
          else next.add(path);
          return next;
        })
      }
      onFileSelect={(path) => selectFile(path)}
      renderActions={(node) =>
        workspace && lockedPath(workspace, node.path, !!node.children) ? (
          node.children ? (
            <DependencyFolderActions
              path={node.path}
              packages={(workspace.dependencies ?? []).filter(
                (dep) =>
                  node.path === dep.name ||
                  node.path.startsWith(dep.name + "/") ||
                  dep.name.startsWith(node.path + "/")
              )}
              disabled={disabled}
              onDelete={(name) => onOpenDependencies?.(name, true)}
            />
          ) : (
            <Text
              fontSize="9px"
              color="text.tertiary"
              px={1}
              title="Read-only dependency"
            >
              LIB
            </Text>
          )
        ) : Array.isArray(node.children) ? (
          actions(undefined, node.path)
        ) : (
          actions(filesByPath.get(node.path))
        )
      }
      actions={
        <>
          <IconButton
            aria-label="Manage dependencies"
            title="Dependencies"
            icon={<Package size={15} />}
            variant="ghost"
            size="xs"
            isDisabled={disabled || !workspace}
            onClick={() => onOpenDependencies?.()}
          />
          <IconButton
            aria-label={
              searchOpen ? "Show workspace files" : "Search workspace files"
            }
            title={searchOpen ? "Show files" : "Search files"}
            aria-pressed={searchOpen}
            icon={<Search size={15} />}
            variant="ghost"
            size="xs"
            onClick={() => setSearchOpen((value) => !value)}
          />
          <IconButton
            aria-label="New Solidity file"
            title="New file"
            icon={<Plus size={16} />}
            variant="ghost"
            size="sm"
            onClick={() =>
              open(
                "new",
                undefined,
                workspace && lockedPath(workspace, selectedFolder, true)
                  ? ""
                  : selectedFolder
              )
            }
            isDisabled={disabled || !workspace}
          />
          <IconButton
            aria-label="New folder"
            title="New folder"
            icon={<FolderPlus size={16} />}
            variant="ghost"
            size="sm"
            onClick={() =>
              open(
                "newFolder",
                undefined,
                workspace && lockedPath(workspace, selectedFolder, true)
                  ? ""
                  : selectedFolder
              )
            }
            isDisabled={disabled || !workspace}
          />
        </>
      }
      body={
        searchOpen && (inDrawer || !isOpen) ? (
          <SearchPanel
            initialDraft={searchDraft}
            onDraftChange={setSearchDraft}
            replacement={{
              writablePaths,
              disabled,
              onPreview: (query, replacement, options, path) => {
                if (!workspace || disabled) return;
                try {
                  const plan = planReplacements(
                    workspace,
                    query,
                    replacement,
                    options,
                    path
                  );
                  if (!plan.files.length) {
                    toast({ description: "No changes to apply." });
                    return;
                  }
                  setReplacementPlan(plan);
                } catch (error) {
                  toast({
                    status: "error",
                    description:
                      error instanceof Error
                        ? error.message
                        : "Couldn't prepare replacements.",
                  });
                }
              },
            }}
            sourceCode={sources}
            onResultClick={(path, _content, lineNumber) =>
              selectFile(path, lineNumber)
            }
            isOpen={true}
            showHeader={false}
            onCloseSearch={() => setSearchOpen(false)}
          />
        ) : !workspace ? (
          <Text px={3} py={4} color="text.secondary" fontSize="sm">
            Loading files…
          </Text>
        ) : undefined
      }
    />
  );
  return (
    <>
      <ReplacePreview
        plan={replacementPlan}
        stale={previewStale || disabled}
        onClose={() => setReplacementPlan(null)}
        onApply={applyReplacementPlan}
      />
      <Box
        ref={paneRef}
        id="solidity-files-panel"
        bg="bg.subtle"
        w="var(--solidity-explorer-width, 240px)"
        flexShrink={0}
        display={{ base: "none", xl: "block" }}
        borderColor="border.default"
        position="relative"
      >
        <Box position="absolute" inset={0}>
          {list()}
        </Box>
      </Box>
      <Drawer
        isOpen={isOpen && !dialog}
        onClose={onClose}
        placement="left"
        size="xs"
      >
        <DrawerOverlay />
        <DrawerContent bg="bg.subtle">
          <DrawerCloseButton />
          <DrawerHeader fontSize="md">Workspace files</DrawerHeader>
          <DrawerBody
            px={1}
            minH={0}
            overflow="hidden"
            display="flex"
            flexDirection="column"
          >
            {list(true)}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
      <Modal
        isOpen={!!dialog}
        onClose={() => setDialog(null)}
        initialFocusRef={inputRef}
        isCentered
      >
        <ModalOverlay />
        <ModalContent mx={4} bg="bg.muted">
          <ModalHeader fontSize="lg">
            {dialog?.type === "newFolder"
              ? "New folder"
              : dialog?.type === "renameFolder"
                ? "Rename / move folder"
                : dialog?.type === "deleteFolder"
                  ? "Delete folder"
                  : dialog?.type === "new"
                    ? "New file"
                    : dialog?.type === "rename"
                      ? "Rename / move file"
                      : "Delete file"}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {dialog?.type === "deleteFolder" ? (
              <Text fontSize="sm">
                Delete {dialog.folder} and its{" "}
                {workspace?.files.filter((file) =>
                  insideFolder(file.name, dialog.folder!)
                ).length ?? 0}{" "}
                files? Recent file versions remain in Local history.
              </Text>
            ) : dialog?.type === "delete" ? (
              <Text fontSize="sm">
                Delete {dialog.file?.name}? You can undo immediately afterward.
              </Text>
            ) : (
              <Input
                ref={inputRef}
                aria-label={
                  dialog?.type.endsWith("Folder")
                    ? "Folder path"
                    : "Solidity filename"
                }
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submit();
                }}
                autoComplete="off"
                isInvalid={!!error}
              />
            )}
            {(dialog?.type === "rename" || dialog?.type === "renameFolder") && (
              <Text mt={2} fontSize="xs" color="text.secondary">
                Use a path to move. Update affected imports after renaming.
              </Text>
            )}
            {error && (
              <Text role="alert" fontSize="sm" color="error.text" mt={2}>
                {error}
              </Text>
            )}
          </ModalBody>
          <ModalFooter gap={2}>
            <Button size="sm" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={submit}
              isDisabled={disabled}
            >
              {dialog?.type === "newFolder"
                ? "Create folder"
                : dialog?.type === "new"
                  ? "Create file"
                  : dialog?.type === "rename" || dialog?.type === "renameFolder"
                    ? "Save"
                    : "Delete"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
