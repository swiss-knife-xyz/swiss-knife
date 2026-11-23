"use client";
import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  IconButton,
  Link,
  Grid,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  ArrowRight,
  ArrowUpRight,
  History,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import type { JsonFragmentType } from "ethers";
import type { DeploymentHistoryController } from "./useDeploymentHistory";
import type { DeploymentRecord } from "@/lib/solidity/deployments";
import {
  constructorsMatch,
  deploymentMatchesContract,
  loadDeploymentConstructor,
  reuseConstructorValues,
} from "@/lib/solidity/deploymentConstructor";
import { stringifyConstructorValues } from "@/lib/solidity/constructorArguments";
import { CopyToClipboard } from "@/components/CopyToClipboard";
import { shortenAddress } from "@/utils/helpers";
import { chainIdToChain, chainIdToImage } from "@/data/common";
type Loaded = Awaited<ReturnType<typeof loadDeploymentConstructor>>;
export function ReuseConstructorArguments({
  contract,
  inputs,
  history,
  disabled,
  onReuse,
}: {
  contract: { name: string; sourcePath: string };
  inputs: readonly JsonFragmentType[];
  history: DeploymentHistoryController;
  disabled: boolean;
  onReuse(values: Record<number, any>): void;
}) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState<Record<string, Loaded | string>>({});
  const [error, setError] = useState("");
  const records = history.records.filter(
    (record) => deploymentMatchesContract(record, contract)
  );
  const latest = useRef(records);
  latest.current = records;
  const ids = records.map((record) => record.id).join(":");
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoaded({});
    setError("");
    let next = 0;
    const entries = latest.current;
    const worker = async () => {
      while (!controller.signal.aborted && next < entries.length) {
        const record = entries[next++];
        try {
          const result = await loadDeploymentConstructor(
            record,
            history.getBuild,
            AbortSignal.any([controller.signal, AbortSignal.timeout(25000)])
          );
          if (!controller.signal.aborted)
            setLoaded((current) => ({ ...current, [record.id]: result }));
        } catch {
          if (!controller.signal.aborted)
            setLoaded((current) => ({
              ...current,
              [record.id]: "Arguments unavailable",
            }));
        }
      }
    };
    void Promise.all(
      Array.from({ length: Math.min(4, entries.length) }, worker)
    );
    return () => controller.abort();
  }, [open, ids, history.getBuild]);
  if (!records.length) return null;
  const apply = (record: DeploymentRecord, result: Loaded) => {
    if (disabled) return;
    try {
      const values = reuseConstructorValues(
        inputs,
        result.inputs,
        record.constructorArgs
      );
      onReuse(values);
      setOpen(false);
    } catch {
      setError(
        "Constructor parameters have changed. Choose a matching deployment."
      );
    }
  };
  return (
    <>
      <Button
        size="xs"
        h="auto"
        py={1}
        variant="ghost"
        color="primary.300"
        ml="auto"
        maxW="full"
        isDisabled={disabled}
        onClick={() => setOpen(true)}
      >
        <HStack as="span" spacing={1} color="inherit" minW={0}>
          <History size={13} style={{flexShrink: 0}} />
          <Text as="span" color="inherit" whiteSpace="normal" textAlign="center">
            Reuse from prev deployments
          </Text>
        </HStack>
      </Button>
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        isCentered
        scrollBehavior="inside"
        size="2xl"
      >
        <ModalOverlay />
        <ModalContent
          mx={4}
          bg="bg.muted"
          maxH="calc(100dvh - 2rem)"
          overflow="hidden"
        >
          <ModalHeader
            pr={12}
            pt={6}
            pb={5}
            borderBottomWidth="1px"
            borderColor="border.default"
          >
            <Text fontSize="lg" fontWeight="semibold">
              Reuse constructor arguments
            </Text>
            <HStack
              mt={1}
              spacing={2}
              fontSize="xs"
              color="text.secondary"
              fontWeight="normal"
            >
              <Text as="span" color="inherit">
                {records.length}{" "}
                {records.length === 1 ? "deployment" : "deployments"}
              </Text>
              <Text as="span" color="text.tertiary">
                /
              </Text>
              <Text as="span" color="inherit">
                {inputs.length}{" "}
                {inputs.length === 1 ? "parameter" : "parameters"}
              </Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton top={5} right={4} />
          <ModalBody px={{ base: 4, md: 6 }} py={5}>
            <VStack align="stretch" spacing={4}>
              {error && (
                <Text fontSize="sm" color="error.text" role="alert">
                  {error}
                </Text>
              )}
              {records.map((record) => {
                const result = loaded[record.id];
                const data =
                  result && typeof result !== "string" ? result : undefined;
                const matches =
                  !!data && constructorsMatch(inputs, data.inputs);
                return (
                  <Box
                    key={record.id}
                    borderWidth="1px"
                    borderColor="border.default"
                    borderRadius="lg"
                    overflow="hidden"
                  >
                    <Box px={{ base: 3, md: 4 }} py={4} bg="bg.subtle">
                      <Flex
                        align="start"
                        justify="space-between"
                        gap={3}
                        wrap="wrap"
                      >
                        <Box minW={0} flex="1 1 220px">
                          <Text
                            fontSize="md"
                            fontWeight="semibold"
                            overflowWrap="anywhere"
                          >
                            {record.contractName}
                          </Text>
                          <Flex align="center" gap={2} mt={2} wrap="wrap">
                            <HStack spacing={1.5}>
                              {chainIdToImage[record.chainId] && (
                                <Image
                                  src={chainIdToImage[record.chainId]}
                                  alt=""
                                  boxSize={4}
                                  rounded="full"
                                />
                              )}
                              <Text fontSize="xs" color="text.secondary">
                                {chainIdToChain[record.chainId]?.name ??
                                  `Chain ${record.chainId}`}
                              </Text>
                            </HStack>
                            {record.imported && (
                              <Text
                                fontSize="10px"
                                color="text.secondary"
                                borderWidth="1px"
                                borderColor="border.default"
                                px={1.5}
                                py={0.5}
                                rounded="md"
                              >
                                Imported
                              </Text>
                            )}
                            {record.address ? (
                              <HStack spacing={0}>
                                <Text
                                  fontFamily="mono"
                                  fontSize="xs"
                                  color="text.tertiary"
                                  title={record.address}
                                >
                                  {shortenAddress(record.address)}
                                </Text>
                                <CopyToClipboard
                                  aria-label="Copy deployment address"
                                  sx={{ "& svg": { width: "13px", height: "13px" } }}
                                  textToCopy={record.address}
                                  size="xs"
                                  h={6}
                                  minW={6}
                                  px={1}
                                />
                                {chainIdToChain[record.chainId]?.blockExplorers
                                  ?.default.url && (
                                  <IconButton
                                    as={Link}
                                    href={`${chainIdToChain[record.chainId].blockExplorers!.default.url}/address/${record.address}`}
                                    isExternal
                                    aria-label={`Open ${record.contractName} on block explorer`}
                                    icon={<ArrowUpRight size={13} />}
                                    size="xs"
                                    variant="ghost"
                                    color="text.secondary"
                                    h={6}
                                    minW={6}
                                    px={1}
                                  />
                                )}
                              </HStack>
                            ) : (
                              <Text fontSize="xs" color="text.tertiary">
                                {new Date(record.createdAt).toLocaleString()}
                              </Text>
                            )}
                          </Flex>
                        </Box>
                        <VStack align="end" spacing={2} ml="auto">
                          <Button
                            size="sm"
                            h={8}
                            fontSize="xs"
                            variant="primary"
                            rightIcon={<ArrowRight size={14} />}
                            isDisabled={!matches || disabled}
                            aria-label={`Reuse ${record.contractName} constructor arguments`}
                            onClick={() => data && apply(record, data)}
                          >
                            Use arguments
                          </Button>
                          {data && (
                            <HStack
                              spacing={1}
                              color={matches ? "success.text" : "warning.text"}
                            >
                              <Icon
                                as={matches ? CheckCircle2 : AlertTriangle}
                                boxSize={3}
                              />
                              <Text fontSize="10px" color="inherit">
                                {matches ? "Compatible" : "Constructor changed"}
                              </Text>
                            </HStack>
                          )}
                        </VStack>
                      </Flex>
                    </Box>
                    {!result ? (
                      <HStack
                        px={4}
                        py={5}
                        spacing={2}
                        fontSize="xs"
                        color="text.secondary"
                        borderTopWidth="1px"
                        borderColor="border.default"
                      >
                        <Spinner size="xs" />
                        <Text>Loading arguments…</Text>
                      </HStack>
                    ) : typeof result === "string" ? (
                      <Text
                        px={4}
                        py={5}
                        fontSize="xs"
                        color="text.secondary"
                        borderTopWidth="1px"
                        borderColor="border.default"
                      >
                        {result}
                      </Text>
                    ) : (
                      <>
                        {!matches && (
                          <Text
                            px={4}
                            py={3}
                            fontSize="xs"
                            color="warning.text"
                            borderTopWidth="1px"
                            borderColor="border.default"
                          >
                            Constructor parameters don’t match
                          </Text>
                        )}
                        <Box as="dl" m={0}>
                          {result.inputs.map((input, index) => {
                            const value = result.values[index];
                            const text =
                              typeof value === "string" ||
                              typeof value === "bigint"
                                ? String(value)
                                : stringifyConstructorValues(value, 2);
                            return (
                              <Grid
                                key={index}
                                templateColumns={{
                                  base: "minmax(0, 1fr)",
                                  sm: "minmax(125px, 0.7fr) minmax(0, 1.5fr)",
                                }}
                                gap={{ base: 2, md: 4 }}
                                px={{ base: 3, md: 4 }}
                                py={3}
                                borderTopWidth="1px"
                                borderColor="border.default"
                                alignItems="start"
                              >
                                <Box as="dt" minW={0}>
                                  <Text
                                    fontSize="xs"
                                    fontWeight="medium"
                                    color="text.primary"
                                    overflowWrap="anywhere"
                                  >
                                    {input.name || `param_${index}`}
                                  </Text>
                                  <Text
                                    fontFamily="mono"
                                    fontSize="10px"
                                    color="text.tertiary"
                                    mt={0.5}
                                  >
                                    {input.type}
                                  </Text>
                                </Box>
                                <HStack
                                  as="dd"
                                  m={0}
                                  minW={0}
                                  spacing={2}
                                  align="start"
                                  justify="space-between"
                                >
                                  <Text
                                    as="code"
                                    fontFamily="mono"
                                    fontSize="xs"
                                    lineHeight="tall"
                                    whiteSpace="pre-wrap"
                                    overflowWrap="anywhere"
                                    minW={0}
                                    pt={0.5}
                                  >
                                    {text}
                                  </Text>
                                  <CopyToClipboard
                                    aria-label={`Copy ${input.name || `param_${index}`} from deployment`}
                                    textToCopy={text}
                                    size="xs"
                                    h={6}
                                    minW={6}
                                    px={1}
                                    flexShrink={0}
                                  />
                                </HStack>
                              </Grid>
                            );
                          })}
                          {!result.inputs.length && (
                            <Text
                              px={4}
                              py={4}
                              fontSize="xs"
                              color="text.secondary"
                              borderTopWidth="1px"
                              borderColor="border.default"
                            >
                              No constructor arguments
                            </Text>
                          )}
                        </Box>
                      </>
                    )}
                  </Box>
                );
              })}
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
