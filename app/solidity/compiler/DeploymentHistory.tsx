"use client";
import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  Image,
  Link,
  Spinner,
  Text,
  VStack,
  useToast,
} from "@chakra-ui/react";
import {
  ArrowUpRight,
  ChevronDown,
  Download,
  History,
  MousePointer2,
  Trash2,
} from "lucide-react";
import { chainIdToChain, chainIdToImage } from "@/data/common";
import { CopyToClipboard } from "@/components/CopyToClipboard";
import { Toast } from "@/components/Toast";
import { getPath } from "@/utils";
import { shortenAddress } from "@/utils/helpers";
import subdomains from "@/subdomains";
import { PROVIDERS } from "@/lib/verification/source";
import { DeploymentScrollArea } from "./DeploymentScrollArea";
import { DeploymentConstructorArguments } from "./DeploymentConstructorArguments";
import { DeploymentVerification } from "./DeploymentVerification";
import { compilerVersion } from "@/lib/solidity/settings";
import type { DeploymentRecord } from "@/lib/solidity/deployments";
import type { DeploymentHistoryController } from "./useDeploymentHistory";
const labels = {
  wallet: "Check wallet",
  pending: "Confirming",
  success: "Confirmed",
  reverted: "Reverted",
  unknown: "Check receipt",
  rejected: "Rejected",
};
function Row({
  record,
  history,
}: {
  record: DeploymentRecord;
  history: DeploymentHistoryController;
}) {
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const wasOpen = useRef(false);
  const revealFrame = useRef<number | undefined>(undefined);
  useEffect(() => () => {
    if (revealFrame.current !== undefined) cancelAnimationFrame(revealFrame.current);
  }, []);
  const toast = useToast();
  const remove = async () => {
    setRemoving(true);
    setError("");
    try {
      await history.remove(record.id);
      toast({
        duration: 7000,
        position: "bottom",
        render: ({ id, onClose }) => (
          <Toast
            id={id}
            description="Deployment removed"
            action={
              <Button
                size="xs"
                variant="ghost"
                onClick={() =>
                  void history
                    .restore(record.id)
                    .then(onClose)
                    .catch((error) =>
                      toast({
                        status: "error",
                        title: "Couldn't restore deployment",
                        description:
                          error instanceof Error ? error.message : "Try again.",
                      }),
                    )
                }
              >
                Undo
              </Button>
            }
          />
        ),
      });
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Couldn't delete deployment."
      );
      setRemoving(false);
    }
  };
  const chain = chainIdToChain[record.chainId];
  const explorer = chain?.blockExplorers?.default.url;
  const waitingForWallet =
    record.status === "wallet" && record.id === history.activeId;
  const color =
    record.status === "success"
      ? "success.text"
      : record.status === "reverted" || record.status === "rejected"
        ? "error.text"
        : "warning.text";
  const download = async () => {
    setDownloading(true);
    setError("");
    try {
      const build = await history.getBuild(record.buildId);
      const url = URL.createObjectURL(
        new Blob(
          [JSON.stringify(build.input, null, 2)],
          { type: "application/json" }
        )
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `${record.contractName}-solc-${compilerVersion(build.settings.version)}-standard-input.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Couldn't download Standard JSON."
      );
    } finally {
      setDownloading(false);
    }
  };
  return (
    <Box
      as="details"
      open={record.id === history.activeId}
      onToggle={(event: SyntheticEvent<HTMLDetailsElement>) => {
        const details = event.currentTarget as HTMLDetailsElement;
        if (event.target !== details || wasOpen.current === details.open) return;
        wasOpen.current = details.open;
        if (revealFrame.current !== undefined) cancelAnimationFrame(revealFrame.current);
        if (!details.open) return;
        revealFrame.current = requestAnimationFrame(() => {
          if (!details.isConnected || !details.open) return;
          details.scrollIntoView?.({
            behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "auto" : "smooth",
            block: "nearest",
          });
        });
      }}
      borderWidth="1px"
      borderColor="border.default"
      borderRadius="lg"
      minW={0}
      sx={{
        "&[open] > summary .deployment-chevron": {
          transform: "rotate(180deg)",
        },
      }}
    >
      <Box
        as="summary"
        cursor="pointer"
        listStyleType="none"
        px={3}
        py={3}
        sx={{ "&::-webkit-details-marker": { display: "none" } }}
      >
        <Flex align="center" justify="space-between" gap={2} minW={0}>
          <Text
            fontSize="sm"
            fontWeight="500"
            isTruncated
            title={record.sourcePath}
          >
            {record.contractName}
          </Text>
          <HStack spacing={1.5} flexShrink={0}>
            {record.status === "pending" || waitingForWallet ? (
              <Spinner size="xs" color={color} />
            ) : (
              <Box w="6px" h="6px" bg={color} borderRadius="full" />
            )}
            <Text fontSize="xs" color={color}>
              {record.imported ? "Imported" : waitingForWallet ? "Confirm in wallet" : labels[record.status]}
            </Text>
            {record.hash && explorer && (
              <IconButton
                as={Link}
                href={`${explorer}/tx/${record.hash}`}
                isExternal
                aria-label={`Open ${record.contractName} deployment transaction`}
                size="xs"
                variant="ghost"
                icon={<ArrowUpRight size={14} />}
              />
            )}
            <ChevronDown className="deployment-chevron" size={14} />
          </HStack>
        </Flex>
        <Flex
          gap={2}
          mt={1}
          justify="space-between"
          color="text.secondary"
          fontSize="xs"
        >
          <HStack spacing={1.5} minW={0}>
            {chainIdToImage[record.chainId] && (
              <Image src={chainIdToImage[record.chainId]} alt="" boxSize="14px" rounded="full" objectFit="contain" flexShrink={0} />
            )}
            <Text isTruncated>{chain?.name ?? `Chain ${record.chainId}`}</Text>
          </HStack>
          <Text
            as="time"
            dateTime={new Date(record.createdAt).toISOString()}
            flexShrink={0}
          >
            {new Date(record.createdAt).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </Text>
        </Flex>
      </Box>
      <VStack align="stretch" spacing={3} p={3} pt={0} fontSize="xs">
        {history.workspaceId && record.workspaceId !== history.workspaceId && (
          <Text color="warning.text">
            Unsaved deployment from another workspace
          </Text>
        )}
        {record.address && (
          <Box pt={3} borderTopWidth="1px" borderColor="border.default">
            <Flex
              justify="space-between"
              wrap="wrap"
              align="center"
              gap={2}
              mb={1.5}
            >
              <Text color="text.secondary">Contract address</Text>
              <Button
                as={Link}
                variant="primary"
                size="xs"
                flexShrink={0}
                rightIcon={<MousePointer2 size={13} />}
                href={`${getPath(subdomains.CONTRACT.base)}${record.chainId}/${record.address}`}
                isExternal
              >
                Interact
              </Button>
            </Flex>
            <HStack spacing={1} minW={0}>
              <Text fontFamily="mono" whiteSpace="nowrap" title={record.address} minW={0}>
                {shortenAddress(record.address)}
              </Text>
              <CopyToClipboard
                aria-label="Copy saved contract address"
                textToCopy={record.address}
                size="xs"
                flexShrink={0}
              />
              {explorer && (
                <IconButton
                  as={Link}
                  href={`${explorer}/address/${record.address}`}
                  isExternal
                  aria-label="Open saved contract on block explorer"
                  size="xs"
                  variant="ghost"
                  icon={<ArrowUpRight size={14} />}
                  flexShrink={0}
                />
              )}
            </HStack>
          </Box>
        )}
        {record.arguments !== "[]" && (
          <DeploymentConstructorArguments record={record} getBuild={history.getBuild} />
        )}
        {record.imported ? (
          <Link href={record.imported.sourceUrl} isExternal fontSize="xs" color="primary.300" display="inline-flex" alignItems="center" gap={1}>
            Source verified on {PROVIDERS[record.imported.provider]} <ArrowUpRight size={13} />
          </Link>
        ) : (
        <DeploymentVerification record={record} getBuild={history.getBuild} hasUnsaved={history.hasUnsaved} saveProgress={history.saveVerification ? (provider,progress)=>history.saveVerification(record.id,provider,progress) : undefined} />
        )}
        {!record.imported && !record.hash && record.status !== "rejected" && !waitingForWallet && (
          <Text color="warning.text">
            No transaction hash yet. Check your wallet before deploying again.
          </Text>
        )}
        {record.error && (
          <Text
            color={
              record.status === "rejected" ? "text.secondary" : "error.text"
            }
          >
            {record.error}
          </Text>
        )}
        <HStack justify="space-between" spacing={2}>
          <Button
            size="xs"
            variant="secondary"
            minW={0}
            title="Download Standard JSON"
            leftIcon={<Download size={13} />}
            isLoading={downloading}
            onClick={() => void download()}
          >
            <Text as="span" isTruncated>Download Standard JSON</Text>
          </Button>
          {!record.imported && (
          <Button
            size="xs"
            variant="ghost"
            flexShrink={0}
            leftIcon={<Trash2 size={13} />}
            aria-label={`Delete ${record.contractName} deployment`}
            isLoading={removing}
            onClick={() => void remove()}
            _hover={{ color: "error.text", bg: "bg.emphasis" }}
          >
            Delete
          </Button>
          )}
        </HStack>
        {record.status === "unknown" && record.hash && (
            <Button
              size="xs"
              variant="ghost"
              alignSelf="flex-start"
              onClick={() =>
                void history
                  .update(record.id, { status: "pending", error: undefined })
                  .catch(() => {})
              }
            >
              Check receipt
            </Button>
        )}
        {error && <Text color="error.text">{error}</Text>}
      </VStack>
    </Box>
  );
}
export function DeploymentHistory({
  history,
}: {
  history: DeploymentHistoryController;
}) {
  const records = [...history.records, ...(history.recoveryRecords ?? [])];
  if (!records.length && !history.error) return null;
  return (
    <Box borderTopWidth="1px" borderColor="border.default" p={4} mt={3}>
      <HStack spacing={2} mb={3}>
        <History size={16} />
        <Text fontSize="sm" fontWeight="500">
          Deployments
        </Text>
        <Text fontSize="xs" color="text.secondary">
          {records.length || ""}
        </Text>
      </HStack>
      {history.error && (
        <Alert
          status="error"
          rounded="md"
          fontSize="xs"
          mb={3}
          alignItems="start"
        >
          <AlertIcon />
          <Box minW={0}>
            <Text overflowWrap="anywhere">
              {history.hasUnsaved
                ? "The latest deployment status isn't saved. Keep this tab open and retry saving."
                : history.error}
            </Text>
            <Button
              size="xs"
              mt={2}
              variant="secondary"
              onClick={() =>
                void (history.hasUnsaved
                  ? history.retrySaving()
                  : history.refresh())
              }
            >
              {history.hasUnsaved ? "Retry saving" : "Retry loading"}
            </Button>
          </Box>
        </Alert>
      )}
      <DeploymentScrollArea>
        {records.map((record) => (
          <Row key={record.id} record={record} history={history} />
        ))}
      </DeploymentScrollArea>
    </Box>
  );
}
