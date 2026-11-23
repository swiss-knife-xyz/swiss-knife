"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Box, Button, Flex, HStack, Text } from "@chakra-ui/react";
import {
  CircleAlert,
  CircleCheck,
  CopyPlus,
  GitCompareArrows,
} from "lucide-react";
import { importedChanges } from "@/lib/solidity/importedOriginal";
import type {
  DeploymentBuild,
  DeploymentRecord,
} from "@/lib/solidity/deployments";
import type { SolidityWorkspace } from "@/lib/solidity/workspace";
import type { DeploymentHistoryController } from "./useDeploymentHistory";
const OriginalComparison = dynamic(() => import("./OriginalComparison"), {
  ssr: false,
});

export function ImportedWorkspaceStatus({
  workspace,
  workspaceId,
  workspaceNames,
  history,
  disabled,
  onOpenOriginal,
  onNavigate,
  onRevertOriginal,
}: {
  onNavigate(fileId: string, lineNumber: number): void;
  onRevertOriginal(
    workspace: SolidityWorkspace,
    original: DeploymentBuild
  ): Promise<void>;
  workspace: SolidityWorkspace;
  workspaceId: string;
  workspaceNames: string[];
  history: DeploymentHistoryController;
  disabled: boolean;
  onOpenOriginal(
    name: string,
    record: DeploymentRecord,
    build: DeploymentBuild
  ): Promise<void>;
}) {
  const identity = workspace.importedContract;
  const record = history.records.find(
    (item) =>
      item.workspaceId === workspaceId &&
      !item.deletedAt &&
      item.imported &&
      item.chainId === identity?.chainId &&
      item.address?.toLowerCase() === identity?.address.toLowerCase()
  );
  const [original, setOriginal] = useState<DeploymentBuild | null>(null);
  const [error, setError] = useState("");
  const [compare, setCompare] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    let cancelled = false;
    setOriginal(null);
    setError("");
    if (!record) return;
    void history
      .getBuild(record.buildId)
      .then((build) => {
        if (cancelled) return;
        if (!build || build.workspaceId !== workspaceId)
          throw new Error("Original source unavailable.");
        setOriginal(build);
      })
      .catch(() => {
        if (!cancelled) setError("Original source unavailable.");
      });
    return () => {
      cancelled = true;
    };
  }, [record?.buildId, workspaceId, history.getBuild]);
  const changes = useMemo(
    () => (original ? importedChanges(workspace, original) : null),
    [workspace.files, workspace.compilerSettings, original]
  );
  const openOriginal = async () => {
    if (disabled || lock.current || !record || !original) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const base = `${original.contract.name.slice(0, 40)} (original)`;
    let name = base,
      index = 2;
    while (
      workspaceNames.some((value) => value.toLowerCase() === name.toLowerCase())
    )
      name = `${base} ${index++}`;
    try {
      await onOpenOriginal(name, record, original);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Couldn't open original source."
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  if (!identity) return null;
  const unavailable =
    error || (history.ready && !record ? "Original source unavailable." : "");
  if (!changes && !unavailable) return null;
  const matchesOriginal = Boolean(changes && !changes.modified && !unavailable);
  return (
    <Box py={2.5} borderBottomWidth="1px" borderColor="border.default">
      <Flex align="center" justify="flex-end" gap={2} wrap="wrap">
        <HStack
          spacing={1.5}
          color={matchesOriginal ? "green.300" : "warning.text"}
          role="status"
        >
          {matchesOriginal ? (
            <CircleCheck size={14} />
          ) : (
            <CircleAlert size={14} />
          )}
          <Text fontSize="sm">
            {matchesOriginal
              ? "Matches onchain source code"
              : changes?.modified
                ? "Modified locally"
                : unavailable}
          </Text>
        </HStack>
        {original && changes?.modified && (
          <HStack spacing={1} flexWrap="wrap">
            <Button
              size="xs"
              variant="ghost"
              leftIcon={<GitCompareArrows size={13} />}
              onClick={() => setCompare(true)}
            >
              Compare with original
            </Button>
            <Button
              size="xs"
              variant="ghost"
              leftIcon={<CopyPlus size={13} />}
              isDisabled={disabled}
              isLoading={busy}
              onClick={() => void openOriginal()}
            >
              Open original in new workspace
            </Button>
          </HStack>
        )}
      </Flex>
      {error && changes?.modified && (
        <Text role="alert" fontSize="xs" color="error.text" mt={1}>
          {error}
        </Text>
      )}
      {compare && original && changes && (
        <OriginalComparison
          workspace={workspace}
          original={original}
          changes={changes}
          onClose={() => setCompare(false)}
          onNavigate={onNavigate}
          disabled={disabled}
          onRevert={() => onRevertOriginal(workspace, original)}
        />
      )}
    </Box>
  );
}
