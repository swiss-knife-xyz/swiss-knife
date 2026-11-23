"use client";
import { useEffect, useRef, useState } from "react";
import { Box, Button, HStack, Text, Tooltip } from "@chakra-ui/react";
import { Upload } from "lucide-react";
import { chainIdToChain } from "@/data/common";
import {
  VERIFICATION_CHAINS,
  VERIFICATION_MESSAGES,
  VerificationError,
} from "@/lib/verification/source";
import type {
  StoredVerificationProgress,
  VerificationProgress,
} from "@/lib/verification/progress";
import { ProviderClient } from "@/lib/verification/providers";
import { deploymentVerificationSource } from "@/lib/solidity/verificationInput";
import {
  verificationSourceId,
  submitDeploymentSourcify,
  deploymentEtherscanVerification,
} from "@/lib/solidity/verificationClient";
import type {
  DeploymentBuild,
  DeploymentRecord,
} from "@/lib/solidity/deployments";
import {
  VerificationStatusRow,
  type VerificationTask,
} from "@/components/Verification/VerificationStatusRow";
type Provider = "sourcify" | "etherscan";
export function DeploymentVerification({
  record,
  getBuild,
  saveProgress,
  hasUnsaved,
}: {
  record: DeploymentRecord;
  getBuild: (id: string) => Promise<DeploymentBuild>;
  hasUnsaved?: boolean;
  saveProgress?: (
    provider: Provider,
    progress: StoredVerificationProgress
  ) => Promise<void>;
}) {
  const [tasks, setTasks] = useState<
    Partial<Record<Provider, VerificationTask>>
  >({});
  const [loading, setLoading] = useState<Provider>();
  const [error, setError] = useState("");
  const mounted = useRef(false);
  const starting = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const supported = VERIFICATION_CHAINS[String(record.chainId)];
  const providers: Provider[] = (["sourcify", "etherscan"] as const).filter(
    (provider) => !!supported?.[provider]
  );
  const name = (provider: Provider) =>
    provider === "sourcify"
      ? "Sourcify"
      : (chainIdToChain[record.chainId]?.blockExplorers?.default.name ??
        "Etherscan");
  const makeTask = (
    provider: Provider,
    sourceId: string,
    initial?: StoredVerificationProgress,
    prepared?: {
      source: ReturnType<typeof deploymentVerificationSource>;
      bytecode: string;
    }
  ): VerificationTask => {
    const { chainId } = record,
      address = record.address!,
      hash = record.hash!;
    return {
      id: `${record.id}:${provider}:${sourceId}`,
      provider,
      chainId,
      address,
      providerName: name(provider),
      initial,
      save: saveProgress
        ? (progress: VerificationProgress) =>
            saveProgress(provider, {
              ...progress,
              sourceId,
              updatedAt: Date.now(),
            })
        : undefined,
      submit: async (retry) => {
        const data =
          prepared ??
          (await (async () => {
            const build = await getBuild(record.buildId);
            const source = deploymentVerificationSource(build, record);
            if (
              (await verificationSourceId(source, build.contract.bytecode)) !==
              sourceId
            )
              throw new Error("Saved verification input changed.");
            return { source, bytecode: build.contract.bytecode };
          })());
        return provider === "sourcify"
          ? submitDeploymentSourcify(chainId, address, data.source)
          : deploymentEtherscanVerification({
              operation: "submit",
              chainId,
              address,
              hash,
              sourceId,
              source: data.source,
              bytecode: data.bytecode,
              retry,
            });
      },
      status: (guid, signal) =>
        provider === "sourcify"
          ? new ProviderClient(fetch, {}, signal, undefined, true).status(
              "sourcify",
              String(chainId),
              address,
              guid
            )
          : deploymentEtherscanVerification({
              operation: "status",
              chainId,
              address,
              hash,
              sourceId,
              signal,
            }),
    };
  };
  useEffect(() => {
    if (record.status !== "success" || !record.address || !record.hash) return;
    setTasks((current) => {
      let next = current;
      for (const provider of providers) {
        const saved = record.verification?.[provider];
        if (saved && !current[provider]) {
          if (next === current) next = { ...current };
          next[provider] = makeTask(provider, saved.sourceId, saved);
        }
      }
      return next;
    });
  }, [record.id, record.verification, record.status]);
  const start = async (provider: Provider) => {
    if (starting.current || tasks[provider] || record.verification?.[provider])
      return;
    starting.current = true;
    setLoading(provider);
    setError("");
    try {
      const build = await getBuild(record.buildId);
      const source = deploymentVerificationSource(build, record);
      const bytecode = build.contract.bytecode;
      const sourceId = await verificationSourceId(source, bytecode);
      if (!mounted.current) return;
      const task = makeTask(provider, sourceId, undefined, {
        source,
        bytecode,
      });
      setTasks((current) => ({ ...current, [provider]: task }));
    } catch (error) {
      if (mounted.current)
        setError(
          error instanceof VerificationError
            ? VERIFICATION_MESSAGES[error.code]
            : error instanceof Error
              ? error.message
              : "Couldn't load the saved build."
        );
    } finally {
      starting.current = false;
      if (mounted.current) setLoading(undefined);
    }
  };
  if (
    record.status !== "success" ||
    !record.address ||
    !record.hash ||
    !providers.length
  )
    return null;
  return (
    <Box>
      <HStack spacing={2} flexWrap="wrap" align="start">
        {providers.map(provider => (
          <Box key={provider} minW={0} maxW="full">
            {tasks[provider] ? (
              <VerificationStatusRow
                task={tasks[provider]!}
                persisted={hasUnsaved === undefined ? undefined : !hasUnsaved}
                inline
              />
            ) : !record.verification?.[provider] ? (
              <Tooltip label={`Publish the saved source code to ${name(provider)} for verification`}>
                <Button size="xs" variant="secondary" leftIcon={<Upload size={13}/>} isLoading={loading===provider} isDisabled={!!loading} onClick={()=>void start(provider)}>
                  Verify on {name(provider)}
                </Button>
              </Tooltip>
            ) : null}
          </Box>
        ))}
      </HStack>
      {error && (
        <Text fontSize="xs" color="error.text" mt={2}>
          {error}
        </Text>
      )}
    </Box>
  );
}
