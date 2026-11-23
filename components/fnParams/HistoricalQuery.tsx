"use client";

import {
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from "react";
import dynamic from "next/dynamic";
import { SettingsIcon } from "@chakra-ui/icons";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  FormControl,
  Input,
  IconButton,
  Popover,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverFooter,
  PopoverHeader,
  PopoverTrigger,
  Portal,
  Text,
  Skeleton,
  type PopoverProps,
} from "@chakra-ui/react";
import type { PublicClient } from "viem";
import { getRpcUrlsForChain } from "@/data/networks";
import {
  historicalQueryError,
  parseHistoricalTarget,
  resolveHistoricalBlock,
  type HistoricalQueryResult,
  type HistoricalMode,
} from "@/lib/historicalQuery";

const settingsPositionModifiers: NonNullable<PopoverProps["modifiers"]> = [
  {
    name: "preventOverflow",
    options: { altAxis: true, tether: false, padding: 12 },
  },
  {
    name: "observeContentSize",
    enabled: true,
    phase: "write",
    fn: () => {},
    effect: ({ state, instance }) => {
      if (typeof ResizeObserver === "undefined") return;
      // The lazy calendar changes height after Popper's initial placement.
      const observer = new ResizeObserver(() => {
        void instance.update();
      });
      observer.observe(state.elements.popper);
      return () => observer.disconnect();
    },
  },
];

const HistoricalDateTimePicker = dynamic(
  () =>
    import("./HistoricalDateTimePicker").then(
      (module) => module.HistoricalDateTimePicker
    ),
  { ssr: false, loading: () => <Skeleton h="19rem" rounded="md" /> }
);

const RpcSettings = dynamic(
  () =>
    import("@/components/CustomChainModal").then(
      (module) => module.CustomChainModal
    ),
  { ssr: false }
);

type Props = {
  mode: HistoricalMode;
  isOpen: boolean;
  onClose(): void;
  onOpen(): void;
  actionRef: Ref<() => void>;
  onLoadingChange(loading: boolean): void;
  onResultChange(result: HistoricalQueryResult | undefined): void;
  client: PublicClient;
  chainId: number;
  contextKey: string;
  isDisabled: boolean;
  execute(blockNumber: bigint): Promise<unknown>;
};
export default function HistoricalQuery({
  mode,
  isOpen,
  onClose,
  onOpen,
  actionRef,
  onLoadingChange,
  onResultChange,
  client,
  chainId,
  contextKey,
  isDisabled,
  execute,
}: Props) {
  const id = useId();
  const [value, setValue] = useState("");
  const [configured, setConfigured] = useState<Record<HistoricalMode, string>>({
    block: "",
    time: "",
  });
  const configuredValue = configured[mode];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ReturnType<
    typeof historicalQueryError
  > | null>(null);
  const [rpcOpen, setRpcOpen] = useState(false);
  const request = useRef<AbortController | null>(null);
  const rpcKey = getRpcUrlsForChain(chainId).join("|");
  const key = `${contextKey}:${mode}:${rpcKey}`;
  const currentKey = useRef(key);
  currentKey.current = key;
  const inputRef = useRef<HTMLInputElement>(null!);
  useEffect(() => {
    request.current?.abort();
    setLoading(false);
    onResultChange(undefined);
    setError(null);
    return () => request.current?.abort();
  }, [key, client, onResultChange]);
  useEffect(() => {
    if (isOpen) setValue(configuredValue);
  }, [isOpen, mode, configuredValue]);
  useEffect(() => {
    onLoadingChange(loading);
  }, [loading, onLoadingChange]);
  useEffect(
    () => () => {
      onLoadingChange(false);
      onResultChange(undefined);
    },
    [onLoadingChange, onResultChange]
  );
  const changeTarget = (next: string) => {
    setError(null);
    setValue(next);
  };
  const saveTarget = () => {
    try {
      if (value.trim()) parseHistoricalTarget(mode, value);
      request.current?.abort();
      setLoading(false);
      setError(null);
      onResultChange(undefined);
      setConfigured((previous) => ({ ...previous, [mode]: value }));
      onClose();
    } catch (cause) {
      setError(historicalQueryError(cause));
    }
  };
  const cancel = () => {
    request.current?.abort();
    setLoading(false);
    onClose();
  };
  const run = async () => {
    if (isDisabled || loading) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const isCurrent = () =>
      !controller.signal.aborted && currentKey.current === key;
    setError(null);
    onResultChange(undefined);
    setLoading(true);
    try {
      const target = parseHistoricalTarget(mode, configuredValue);
      const block = await resolveHistoricalBlock(client, target, {
        signal: controller.signal,
        rpcKey,
      });
      if (!isCurrent()) return;
      const data = await execute(block.number);
      if (!isCurrent()) return;
      onResultChange({ data, block, contextKey, mode, client });
      onClose();
    } catch (cause) {
      if (isCurrent()) {
        setError(historicalQueryError(cause));
        onOpen();
      }
    } finally {
      if (isCurrent()) setLoading(false);
    }
  };
  let hasTarget = false;
  try {
    if (configuredValue.trim()) {
      parseHistoricalTarget(mode, configuredValue);
      hasTarget = true;
    }
  } catch {
    /* An empty or invalid target has no configured-state indicator. */
  }
  useImperativeHandle(actionRef, () => () => {
    if (!configuredValue.trim()) onOpen();
    else void run();
  });
  return (
    <>
      <Popover
        isLazy
        placement="bottom-end"
        strategy="fixed"
        modifiers={settingsPositionModifiers}
        isOpen={isOpen}
        onOpen={onOpen}
        onClose={onClose}
        initialFocusRef={mode === "block" ? inputRef : undefined}
      >
        <PopoverTrigger>
          <IconButton
            aria-label="Historical query settings"
            aria-expanded={isOpen}
            aria-description={
              hasTarget
                ? mode === "block"
                  ? "Block number configured"
                  : "Date and time configured"
                : undefined
            }
            position="relative"
            _after={
              hasTarget
                ? {
                    content: '""',
                    position: "absolute",
                    top: "-2px",
                    right: "-2px",
                    boxSize: "6px",
                    bg: "blue.400",
                    borderRadius: "full",
                    pointerEvents: "none",
                  }
                : undefined
            }
            icon={
              <SettingsIcon
                transform={isOpen ? "rotate(33deg)" : "rotate(0deg)"}
                transition="transform 200ms ease-out"
              />
            }
            size="sm"
            h={{ base: 10, md: 8 }}
            minW={8}
          />
        </PopoverTrigger>
        <Portal>
          <PopoverContent
            w="min(23rem, calc(100vw - 2rem))"
            maxH="min(36rem, calc(100vh - 2rem))"
            overflowY="auto"
            aria-label="Historical query settings"
            bg="bg.base"
            border="1px solid"
            borderColor="border.subtle"
            rounded="lg"
          >
            <PopoverHeader pr={9} fontWeight="semibold">
              {mode === "block"
                ? "Enter Block Number"
                : "Enter Date & Time (UTC)"}
              <Text
                fontSize="xs"
                fontWeight="normal"
                color="text.secondary"
                mt={1}
              >
                {mode === "time"
                  ? "Uses the last block at or before this time."
                  : "Queries state at the end of this block."}
              </Text>
            </PopoverHeader>
            <PopoverCloseButton />
            <PopoverBody>
              <form
                id={`historical-query-${id}`}
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!loading) saveTarget();
                }}
              >
                {mode === "time" ? (
                  <HistoricalDateTimePicker
                    value={value}
                    onChange={changeTarget}
                    isDisabled={loading}
                  />
                ) : (
                  <FormControl>
                    <Input
                      ref={inputRef}
                      aria-label="Block number"
                      id={`historical-target-${id}`}
                      inputMode="numeric"
                      value={value}
                      onChange={(event) => changeTarget(event.target.value)}
                      placeholder="e.g. 21000000"
                      isDisabled={loading}
                      autoComplete="off"
                    />
                  </FormControl>
                )}
              </form>
              {error && (
                <Alert status="error" mt={4} rounded="md" alignItems="start">
                  <AlertIcon mt={0.5} />
                  <Box fontSize="sm">
                    {error.message}
                    {error.needsArchiveRpc && (
                      <Button
                        display="block"
                        mt={2}
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          cancel();
                          setRpcOpen(true);
                        }}
                      >
                        Manage networks & RPCs
                      </Button>
                    )}
                  </Box>
                </Alert>
              )}
            </PopoverBody>
            <PopoverFooter display="flex" justifyContent="flex-end" gap={2}>
              {mode === "time" && (
                <Button
                  size="sm"
                  variant="ghost"
                  mr="auto"
                  color="text.secondary"
                  isDisabled={loading || !value}
                  onClick={() => changeTarget("")}
                >
                  Clear
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={cancel}>
                Cancel
              </Button>
              <Button
                size="sm"
                colorScheme="blue"
                type="submit"
                form={`historical-query-${id}`}
                isDisabled={loading}
              >
                Set
              </Button>
            </PopoverFooter>
          </PopoverContent>
        </Portal>
      </Popover>
      {rpcOpen && (
        <RpcSettings
          presentation="drawer"
          isOpen
          onClose={() => setRpcOpen(false)}
          onSaved={() => setRpcOpen(false)}
        />
      )}
    </>
  );
}
