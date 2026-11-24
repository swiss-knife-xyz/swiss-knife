"use client";
import { useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { compareSourceFiles } from "@/lib/sourceDiff";
import {
  Box,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalFooter,
  Button,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  ModalOverlay,
  Text,
} from "@chakra-ui/react";
import { CircleCheck, RotateCcw } from "lucide-react";
import type { SolidityWorkspace } from "@/lib/solidity/workspace";
import type { DeploymentBuild } from "@/lib/solidity/deployments";
import type { importedChanges } from "@/lib/solidity/importedOriginal";
const SourceCodeExplorer = dynamic(
  () =>
    import("@/components/SourceCodeExplorer").then(
      (module) => module.SourceCodeExplorer
    ),
  { ssr: false }
);
export default function OriginalComparison({
  workspace,
  original,
  changes,
  onClose,
  onNavigate,
  onRevert,
  disabled,
}: {
  workspace: SolidityWorkspace;
  original: DeploymentBuild;
  changes: ReturnType<typeof importedChanges>;
  disabled: boolean;
  onRevert(): Promise<void>;
  onClose(): void;
  onNavigate(fileId: string, lineNumber: number): void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [revertError, setRevertError] = useState("");
  const cancelRef = useRef<HTMLButtonElement>(null!);
  const lock = useRef(false);
  const revert = async () => {
    if (disabled || lock.current) return;
    lock.current = true;
    setReverting(true);
    setRevertError("");
    try {
      await onRevert();
      setConfirm(false);
      onClose();
    } catch (error) {
      setRevertError(
        error instanceof Error
          ? error.message
          : "Couldn't revert the workspace."
      );
    } finally {
      lock.current = false;
      setReverting(false);
    }
  };
  const sources = useMemo(() => {
    const originalSources = Object.fromEntries(
      Object.entries(original.input.sources).map(([path, source]) => [
        path,
        source.content,
      ])
    );
    const localSources = Object.fromEntries(
      workspace.files.map((file) => [file.name, file.content])
    );
    const changedPaths = new Set(changes.files);
    const sourceCode = Object.fromEntries(
      Object.entries({ ...originalSources, ...localSources }).filter(([path]) =>
        changedPaths.has(path)
      )
    );
    const diffData = Object.fromEntries(
      Object.entries(compareSourceFiles(originalSources, localSources)).filter(
        ([path]) => changedPaths.has(path)
      )
    );
    return { sourceCode, diffData };
  }, [original, workspace.files, changes.files]);
  return (
    <>
      <Modal
        isOpen
        onClose={() => {
          if (!reverting) onClose();
        }}
        size="6xl"
        isCentered
      >
        <ModalOverlay />
        <ModalContent mx={4} bg="bg.muted" maxH="90dvh">
          <ModalHeader fontSize="lg" pr={12}>
            <HStack gap={3} flexWrap="wrap">
              <Text>Compare with original</Text>
              <Button
                size="sm"
                variant="outline"
                color="red.300"
                leftIcon={<RotateCcw size={14} />}
                isDisabled={disabled || reverting || !changes.modified}
                onClick={() => {
                  setRevertError("");
                  setConfirm(true);
                }}
              >
                Revert to original
              </Button>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={4} minH={0} overflowY="auto">
            {!changes.modified && (
              <HStack py={6} spacing={2} color="green.300" role="status">
                <CircleCheck size={18} />
                <Text fontSize="sm">Matches onchain source code</Text>
              </HStack>
            )}
            <HStack
              justify="flex-end"
              mb={3}
              fontSize="xs"
              color="text.secondary"
            >
              <Text>
                {changes.files.length} changed{" "}
                {changes.files.length === 1 ? "file" : "files"}
              </Text>
            </HStack>
            {changes.settings && (
              <Box as="details" mb={3}>
                <Box
                  as="summary"
                  fontSize="sm"
                  color="warning.text"
                  cursor="pointer"
                >
                  Compiler settings changed
                </Box>
                <Text fontSize="xs" mt={2}>
                  Original
                </Text>
                <Box as="pre" fontSize="xs" maxH={40} overflow="auto">
                  {JSON.stringify(original.settings, null, 2)}
                </Box>
                <Text fontSize="xs" mt={2}>
                  Local
                </Text>
                <Box as="pre" fontSize="xs" maxH={40} overflow="auto">
                  {JSON.stringify(workspace.compilerSettings, null, 2)}
                </Box>
              </Box>
            )}
            {changes.files.length > 0 && (
              <Box
                minW={0}
                borderWidth="1px"
                borderColor="border.default"
                rounded="md"
                overflow="hidden"
              >
                <SourceCodeExplorer
                  sourceCode={sources.sourceCode}
                  diffData={sources.diffData}
                  targetFileName={changes.files[0] ?? original.entry}
                  initialHeight={600}
                  initialSidebarWidth={240}
                  maxHeight="calc(90dvh - 200px)"
                  onDiffNavigate={
                    disabled
                      ? undefined
                      : (path, line) => {
                          const file = workspace.files.find(
                            (file) => file.name === path
                          );
                          if (!file) return;
                          onClose();
                          onNavigate(file.id, line);
                        }
                  }
                />
              </Box>
            )}
          </ModalBody>
          <ModalFooter
            borderTopWidth="1px"
            borderColor="border.default"
            justifyContent="flex-end"
            gap={2}
          >
            <Button
              size="sm"
              variant="ghost"
              isDisabled={reverting}
              onClick={onClose}
            >
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <AlertDialog
        isOpen={confirm}
        leastDestructiveRef={cancelRef}
        onClose={() => {
          if (!reverting) setConfirm(false);
        }}
        isCentered
      >
        <AlertDialogOverlay />
        <AlertDialogContent mx={4} bg="bg.muted">
          <AlertDialogHeader fontSize="lg">
            Revert workspace to original?
          </AlertDialogHeader>
          <AlertDialogBody fontSize="sm">
            <Text>
              Restore all imported files and compiler settings. Local edits and
              added files will be removed; deleted files will be restored.
            </Text>
            {revertError && (
              <Text role="alert" color="error.text" mt={3}>
                {revertError}
              </Text>
            )}
          </AlertDialogBody>
          <AlertDialogFooter gap={2}>
            <Button
              ref={cancelRef}
              size="sm"
              isDisabled={reverting}
              onClick={() => setConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              colorScheme="red"
              isLoading={reverting}
              isDisabled={disabled}
              onClick={() => void revert()}
            >
              Revert workspace
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
