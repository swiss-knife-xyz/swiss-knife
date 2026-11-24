"use client";
import { useMemo, useState } from "react";
import {
  Alert,
  AlertIcon,
  Button,
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
} from "@chakra-ui/react";
import { MoreHorizontal, Plus, Pencil, Trash2 } from "lucide-react";
import { DarkSelect } from "@/components/DarkSelect";
import type { WorkspaceSummary } from "@/lib/solidity/workspace";

type Props = {
  workspaces: WorkspaceSummary[];
  importExportActions?: React.ReactNode;
  active: WorkspaceSummary | null;
  fileCount: number;
  disabled: boolean;
  busy: boolean;
  onSwitch(id: string): Promise<void>;
  onCreate(name: string): Promise<void>;
  onRename(name: string): Promise<void>;
  onDelete(): Promise<void>;
};
export function WorkspaceSelector({
  workspaces,
  importExportActions,
  active,
  fileCount,
  disabled,
  busy,
  onSwitch,
  onCreate,
  onRename,
  onDelete,
}: Props) {
  const options = useMemo(
    () => workspaces.map((entry) => ({ value: entry.id, label: entry.name })),
    [workspaces]
  );
  const selectedOption =
    options.find((option) => option.value === active?.id) ?? null;
  const [dialog, setDialog] = useState<"new" | "rename" | "delete" | null>(
    null
  );
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const toast = useToast();
  const open = (type: "new" | "rename" | "delete") => {
    let suggested = "Workspace 2";
    for (
      let i = 3;
      workspaces.some(
        (entry) => entry.name.toLowerCase() === suggested.toLowerCase()
      );
      i++
    )
      suggested = `Workspace ${i}`;
    setName(type === "new" ? suggested : (active?.name ?? ""));
    setError("");
    setDialog(type);
  };
  const submit = async () => {
    if (disabled || busy || !dialog) return;
    setError("");
    try {
      if (dialog === "new") await onCreate(name);
      else if (dialog === "rename") await onRename(name);
      else await onDelete();
      setDialog(null);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Couldn't update the workspace."
      );
    }
  };
  return (
    <>
      <HStack spacing={0} minW={0}>
        <DarkSelect
          ariaLabel="Workspace"
          size="sm"
          selectedOption={selectedOption}
          options={options}
          placeholder="Workspace"
          setSelectedOption={(option) => {
            if (option)
              void onSwitch(String(option.value)).catch((error) =>
                toast({
                  title: "Couldn't switch workspace",
                  description:
                    error instanceof Error ? error.message : "Try again.",
                  status: "error",
                  isClosable: true,
                })
              );
          }}
          isDisabled={disabled || busy}
          boxProps={{ w: { base: "170px", sm: "220px" }, minW: 0 }}
          controlProps={{ h: 8, minH: 8, fontSize: "sm" }}
        />
        <Menu size="compact" placement="bottom-start">
          <MenuButton
            as={IconButton}
            aria-label="Workspace actions"
            icon={<MoreHorizontal size={16} />}
            size="sm"
            variant="ghost"
            isDisabled={disabled || busy}
          />
          <MenuList minW="180px">
            <MenuItem icon={<Plus size={14} />} onClick={() => open("new")}>
              New workspace
            </MenuItem>
            <MenuItem
              icon={<Pencil size={14} />}
              onClick={() => open("rename")}
            >
              Rename workspace
            </MenuItem>
            <MenuItem
              icon={<Trash2 size={14} />}
              onClick={() => open("delete")}
              isDisabled={workspaces.length < 2}
            >
              Delete workspace
            </MenuItem>
            {importExportActions && (
              <>
                <MenuDivider />
                {importExportActions}
              </>
            )}
          </MenuList>
        </Menu>
      </HStack>
      <Modal
        isOpen={!!dialog}
        onClose={() => {
          if (!busy) setDialog(null);
        }}
        isCentered
      >
        <ModalOverlay />
        <ModalContent mx={4} bg="bg.muted">
          <ModalHeader fontSize="lg">
            {dialog === "new"
              ? "New workspace"
              : dialog === "rename"
                ? "Rename workspace"
                : "Delete workspace"}
          </ModalHeader>
          <ModalCloseButton isDisabled={busy} />
          <ModalBody>
            {dialog === "delete" ? (
              <Text fontSize="sm">
                Delete “{active?.name}” and its {fileCount}{" "}
                {fileCount === 1 ? "file" : "files"}, including local history? Export a ZIP first if you
                want to keep a copy.
              </Text>
            ) : (
              <Input
                aria-label="Workspace name"
                autoFocus
                value={name}
                maxLength={60}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void submit();
                }}
                autoComplete="off"
                isDisabled={busy}
                isInvalid={!!error}
              />
            )}
            {error && (
              <Alert status="error" rounded="md" mt={3} fontSize="sm">
                <AlertIcon />
                <Text overflowWrap="anywhere">{error}</Text>
              </Alert>
            )}
          </ModalBody>
          <ModalFooter gap={2}>
            <Button size="sm" onClick={() => setDialog(null)} isDisabled={busy}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              isLoading={busy}
              onClick={() => void submit()}
              isDisabled={disabled}
            >
              {dialog === "new"
                ? "Create workspace"
                : dialog === "rename"
                  ? "Rename"
                  : "Delete workspace"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
