"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  Box,
  Flex,
  HStack,
  Icon,
  IconButton,
  Input,
  Link,
  Spinner,
  Text,
  VisuallyHidden,
} from "@chakra-ui/react";
import {
  ArrowRight,
  Binary,
  CornerDownLeft,
  Clock,
  FileCode2,
  Hash,
  Search,
  Wallet,
} from "lucide-react";
import { useTopLoaderRouter } from "@/hooks/useTopLoaderRouter";
import { detectOmniboxInput, type OmniboxInput } from "@/lib/heroOmnibox";
import { searchToolNavigation } from "@/lib/toolNavigation";
import { getLikelyUnixTimestamp } from "@/lib/unixTimestamp";
import { chainIdToChain } from "@/data/networks";
import { getPath, resolveNameToAddress } from "@/utils";
import { isAddress, zeroAddress } from "viem";
import subdomains from "@/subdomains";
import styles from "./Omnibox.module.css";

function destinations(input: OmniboxInput) {
  const decoder = `${getPath(subdomains.CALLDATA.base)}decoder`;
  if (input.kind === "name")
    return [
      {
        label: "Open Explorer",
        detail: `Resolve ${input.value}`,
        href: "",
        icon: Wallet,
      },
      ...(input.value.endsWith(".eth") ? [{
        label: "ENS History",
        detail: "Registration, ownership & record history",
        href: `${getPath(subdomains.ENS.base)}history/${encodeURIComponent(input.value)}`,
        icon: Clock,
      }] : []),
    ];
  const calldata = `${decoder}?${new URLSearchParams({ calldata: input.value })}`;
  if (input.kind === "address")
    return [
      {
        label: "Open Explorer",
        detail: "Read & write functions",
        href: `${getPath(subdomains.CONTRACT.base)}${input.chainId}/${input.value}`,
        icon: FileCode2,
      },
      {
        label: "Explorer Directory",
        detail: "View across block explorers",
        href: `${getPath(subdomains.EXPLORER.base)}address/${input.value}?chainId=${input.chainId}`,
        icon: Search,
      },
    ];
  if (input.kind === "transaction")
    return [
      {
        label: "Decode transaction calldata",
        detail: "Calldata & events",
        href: `${decoder}?${new URLSearchParams({ tx: input.value, chainId: String(input.chainId) })}`,
        icon: FileCode2,
      },
      {
        label: "Explorer Directory",
        detail: "View across block explorers",
        href: `${getPath(subdomains.EXPLORER.base)}tx/${input.value}?chainId=${input.chainId}`,
        icon: Search,
      },
    ];
  if (input.kind === "integer") {
    const timestamp = getLikelyUnixTimestamp(input.value);
    return [
      ...(timestamp
        ? [
            {
              label: "Epoch Converter",
              detail: `${new Date(Number(timestamp.seconds) * 1000).toISOString().replace("T", " ").replace("Z", " UTC")} · ${timestamp.unit}`,
              href: `${getPath(subdomains.EPOCH_CONVERTER.base)}?${new URLSearchParams({ timestamp: timestamp.seconds })}`,
              icon: Clock,
            },
          ]
        : []),
      {
        label: "Convert ETH units",
        detail: "Wei, gwei & ether",
        href: `${getPath(subdomains.CONVERTER.base)}eth?${new URLSearchParams({ wei: input.value })}`,
        icon: Hash,
      },
    ];
  }
  return [
    {
      label: "Decode calldata",
      detail: "Inspect bytes & parameters",
      href: calldata,
      icon: Binary,
    },
  ];
}

const inputLabels = {
  address: "Address",
  transaction: "Transaction",
  calldata: "Calldata",
  integer: "Integer",
  name: "Name",
};
const inputIcons = {
  address: Wallet,
  transaction: Hash,
  calldata: Binary,
  integer: Hash,
  name: Wallet,
};

export function Omnibox() {
  const router = useTopLoaderRouter();
  const id = useId();
  const [value, setValue] = useState("");
  const [selected, setSelected] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const resolutionRequest = useRef(0);
  const resolutionPending = useRef(false);
  const isBusy = isNavigating || isResolving;
  useEffect(
    () => () => {
      resolutionRequest.current += 1;
    },
    []
  );
  const resultsRef = useRef<HTMLDivElement>(null);
  const input = detectOmniboxInput(value);
  const actions = input
    ? destinations(input).slice(0, isBusy ? 1 : undefined)
    : searchToolNavigation(value).map((result) => ({
        ...result,
        icon: Search,
      }));
  const selectedIndex = Math.min(selected, Math.max(0, actions.length - 1));
  useEffect(() => {
    resultsRef.current
      ?.querySelectorAll("a")
      [selectedIndex]?.scrollIntoView?.({ block: "nearest" });
  }, [selectedIndex, value]);
  const network =
    input && "chainId" in input ? chainIdToChain[input.chainId]?.name : null;
  const resolveAndNavigate = async (name: string) => {
    if (isBusy || resolutionPending.current) return;
    const request = ++resolutionRequest.current;
    resolutionPending.current = true;
    setIsResolving(true);
    setError(null);
    setShowResults(true);
    try {
      const address = await resolveNameToAddress(name);
      if (request !== resolutionRequest.current) return;
      if (!address || !isAddress(address) || address === zeroAddress)
        throw new Error("No address record");
      setIsNavigating(true);
      router.push(
        destinations({ kind: "address", value: address, chainId: 1 })[0].href
      );
    } catch {
      if (request === resolutionRequest.current) {
        setIsNavigating(false);
        setError(`Couldn’t resolve ${name}. Check the name or try again.`);
      }
    } finally {
      if (request === resolutionRequest.current) {
        resolutionPending.current = false;
        setIsResolving(false);
      }
    }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (isBusy) return;
    if (input?.kind === "name" && !actions[selectedIndex]?.href) {
      void resolveAndNavigate(input.value);
      return;
    }
    if (actions[selectedIndex]) router.push(actions[selectedIndex].href);
    else setError("Enter Ethereum data or search for a tool or page.");
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setShowResults(false);
      return;
    }
    if (
      event.nativeEvent.isComposing ||
      !actions.length ||
      !["ArrowDown", "ArrowUp"].includes(event.key)
    )
      return;
    event.preventDefault();
    setShowResults(true);
    setSelected(
      (previous) =>
        (previous + (event.key === "ArrowDown" ? 1 : -1) + actions.length) %
        actions.length
    );
  };

  return (
    <Box
      w="full"
      maxW="640px"
      mx="auto"
      position="relative"
      zIndex={2}
      mt={{ base: 6, md: 10 }}
      textAlign="left"
    >
      <Flex
        as="label"
        htmlFor={id}
        align="center"
        justify="space-between"
        mb={2}
      >
        <Text fontSize="sm" fontWeight="medium" color="text.secondary">
          Paste to explore
        </Text>
        <Text fontSize="xs" color="text.tertiary" aria-hidden="true">
          {isResolving
            ? "Resolving…"
            : isNavigating
              ? "Opening…"
              : "Enter ↵ to open"}
        </Text>
      </Flex>
      <Box
        className={styles.shell}
        data-loading={isBusy || undefined}
        data-invalid={Boolean(error) || undefined}
        onFocusCapture={() => setShowResults(true)}
        onBlurCapture={(event) => {
          if (
            !(event.relatedTarget instanceof Node) ||
            !event.currentTarget.contains(event.relatedTarget)
          )
            setShowResults(false);
        }}
      >
        <Box className={styles.track} aria-hidden="true" />
        <Flex
          className={styles.field}
          as="form"
          onSubmit={submit}
          align="center"
          pl={5}
          pr={3}
          gap={3}
        >
          <Icon
            as={input ? inputIcons[input.kind] : Search}
            boxSize={5}
            color="text.secondary"
            flexShrink={0}
            aria-hidden="true"
          />
          <Input
            id={id}
            autoFocus
            value={value}
            readOnly={isBusy}
            onChange={(event) => {
              setValue(event.target.value);
              setSelected(0);
              setError(null);
              setShowResults(true);
            }}
            onPaste={(event) => {
              if (isBusy || resolutionPending.current) {
                event.preventDefault();
                return;
              }
              const pasted = event.clipboardData.getData("text").trim();
              const detected = detectOmniboxInput(pasted);
              if (
                detected?.kind !== "address" &&
                detected?.kind !== "transaction" &&
                detected?.kind !== "calldata" &&
                detected?.kind !== "name"
              )
                return;
              event.preventDefault();
              setValue(pasted);
              setSelected(0);
              setError(null);
              setShowResults(true);
              if (detected.kind === "name") {
                if (!detected.value.endsWith(".eth")) void resolveAndNavigate(detected.value);
                return;
              }
              setIsNavigating(true);
              router.push(destinations(detected)[0].href);
            }}
            onKeyDown={onKeyDown}
            placeholder="Enter 0x bytes, an address, tx hash, explorer url, ipfs and more"
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            variant="unstyled"
            h={16}
            minW={0}
            fontSize={{ base: "md", md: "sm" }}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            _focus={{ boxShadow: "none", outline: "none" }}
            _focusVisible={{ boxShadow: "none", outline: "none" }}
            _placeholder={{ color: "text.tertiary" }}
          />
          <IconButton
            type="submit"
            isDisabled={isBusy}
            aria-label={actions[selectedIndex]?.label ?? "Open detected tool"}
            icon={<ArrowRight size={18} />}
            size="md"
            rounded="lg"
            variant="ghost"
            flexShrink={0}
            color={actions.length ? "text.primary" : "text.tertiary"}
            bg="whiteAlpha.100"
            _hover={{ bg: "whiteAlpha.200" }}
          />
        </Flex>
        {value.trim() && showResults && (
          <Box
            ref={resultsRef}
            position="absolute"
            top="calc(100% + 8px)"
            left={0}
            right={0}
            zIndex={10}
            bg="bg.subtle"
            border="1px solid"
            borderColor="border.strong"
            rounded="lg"
            p={1.5}
            maxH="min(380px, 50dvh)"
            overflowY="auto"
          >
            <HStack px={2.5} pt={1.5} pb={2} spacing={2} aria-live="polite">
              <Text fontSize="xs" color="text.secondary">
                {input ? inputLabels[input.kind] : "Tools & pages"}
              </Text>
              {network && (
                <Text fontSize="xs" color="text.tertiary">
                  · {network}
                </Text>
              )}
            </HStack>
            {!actions.length && (
              <Text px={2.5} pb={3} fontSize="sm" color="text.secondary">
                No tools or pages found.
              </Text>
            )}
            {actions.map((action, index) => (
              <Link
                key={action.href}
                as={action.href ? "a" : "button"}
                href={action.href || undefined}
                type={action.href ? undefined : "button"}
                w="full"
                textAlign="left"
                display="flex"
                alignItems="center"
                gap={3}
                rounded="md"
                px={2.5}
                py={2.5}
                bg={index === selectedIndex ? "bg.emphasis" : "transparent"}
                onMouseEnter={() => setSelected(index)}
                onClick={(event) => {
                  if (isBusy || !action.href) event.preventDefault();
                  if (!isBusy && !action.href && input?.kind === "name")
                    void resolveAndNavigate(input.value);
                }}
                aria-busy={isBusy || undefined}
                _hover={{ bg: "bg.emphasis", textDecoration: "none" }}
                _focusVisible={{
                  outline: "1px solid",
                  outlineColor: "text.secondary",
                }}
              >
                <Icon
                  as={action.icon}
                  boxSize={4}
                  flexShrink={0}
                  color="text.secondary"
                  aria-hidden="true"
                />
                <Box flex={1} minW={0}>
                  <Text
                    fontSize="sm"
                    fontWeight={index === 0 ? "medium" : "normal"}
                    color="text.primary"
                  >
                    {action.label}
                  </Text>
                  <Text fontSize="xs" color="text.secondary">
                    {action.detail}
                  </Text>
                </Box>
                {isBusy ? (
                  <Spinner
                    size="sm"
                    color="text.secondary"
                    label={isResolving ? "Resolving name" : "Opening tool"}
                  />
                ) : (
                  index === selectedIndex && (
                    <Icon
                      as={CornerDownLeft}
                      boxSize={3.5}
                      color="text.tertiary"
                      aria-hidden="true"
                    />
                  )
                )}
              </Link>
            ))}
          </Box>
        )}
      </Box>
      {error && (
        <Text
          id={`${id}-error`}
          role="alert"
          fontSize="xs"
          color="red.300"
          mt={2}
        >
          {error}
        </Text>
      )}
      <VisuallyHidden aria-live="polite">
        {isBusy
          ? isResolving
            ? "Resolving name"
            : "Opening tool"
          : actions[selectedIndex]
            ? `Enter to ${actions[selectedIndex].label.toLowerCase()}`
            : ""}
      </VisuallyHidden>
    </Box>
  );
}
