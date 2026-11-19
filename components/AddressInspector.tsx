"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  HStack,
  Link,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { ExternalLinkIcon, ViewIcon } from "@chakra-ui/icons";
import { formatUnits, type Address } from "viem";
import { chainIdToChain } from "@/data/common";
import { getPublicClient } from "@/lib/publicClient";
import { CopyToClipboard } from "@/components/CopyToClipboard";

const AddressInspectorContext = createContext<
  ((address: string, trigger: HTMLButtonElement) => void) | null
>(null);
const validAddress = (address: unknown): address is Address =>
  typeof address === "string" && /^0x[0-9a-fA-F]{40}$/.test(address);

/** Present only in the contract inspector scope; never changes a route or a form value. */
export function InspectAddressButton({ address }: { address: unknown }) {
  const inspect = useContext(AddressInspectorContext);
  if (!inspect || !validAddress(address)) return null;
  return (
    <Button
      type="button"
      size="xs"
      flexShrink={0}
      variant="outline"
      aria-label={`Inspect address ${address}`}
      title="Inspect address without leaving this contract"
      onClick={(event) => inspect(address, event.currentTarget)}
      leftIcon={<ViewIcon />}
    >
      Inspect
    </Button>
  );
}

type Details = { balance: bigint; code: string | undefined; nonce: number };
function AddressDetails({
  address,
  chainId,
}: {
  address: Address;
  chainId: number;
}) {
  const [details, setDetails] = useState<Details | null>(null);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const chain = chainIdToChain[chainId];
  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const client = getPublicClient(chainId);
        const [balance, code, nonce] = await Promise.all([
          client.getBalance({ address }),
          client.getCode({ address }),
          client.getTransactionCount({ address }),
        ]);
        if (active) setDetails({ balance, code, nonce });
      } catch {
        if (active) setError(true);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [address, chainId, revision]);

  const explorer = chain?.blockExplorers?.default;
  return (
    <VStack align="stretch" spacing={4}>
      <Text fontSize="sm" color="text.secondary">
        Read-only address details. Your contract form stays unchanged.
      </Text>
      <Text fontSize="sm" fontWeight="semibold">
        {chain?.name ?? "Unknown network"} · Chain {chainId}
      </Text>
      <Text fontFamily="mono" fontSize="sm" overflowWrap="anywhere">
        {address}
      </Text>
      <HStack flexWrap="wrap" gap={2}>
        <CopyToClipboard textToCopy={address} labelText="Copy address" />
        {explorer && (
          <Link
            href={`${explorer.url.replace(/\/$/, "")}/address/${address}`}
            isExternal
            color="primary.400"
            fontSize="sm"
          >
            Open in {explorer.name} <ExternalLinkIcon mx={1} />
          </Link>
        )}
      </HStack>
      {!details && !error && (
        <HStack role="status">
          <Spinner size="sm" />
          <Text>Loading address details…</Text>
        </HStack>
      )}
      {error && (
        <Box>
          <Alert status="error" mb={3}>
            <AlertIcon />
            Unable to load address details on this network.
          </Alert>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setError(false);
              setRevision((value) => value + 1);
            }}
          >
            Retry
          </Button>
        </Box>
      )}
      {details && (
        <VStack align="stretch" spacing={3}>
          <Box>
            <Text color="text.secondary" fontSize="sm">
              Native balance
            </Text>
            <Text overflowWrap="anywhere">
              {formatUnits(details.balance, chain.nativeCurrency.decimals)}{" "}
              {chain.nativeCurrency.symbol}
            </Text>
          </Box>
          <Box>
            <Text color="text.secondary" fontSize="sm">
              Transaction count (nonce)
            </Text>
            <Text>{details.nonce}</Text>
          </Box>
          <Box>
            <Text color="text.secondary" fontSize="sm">
              Code at address
            </Text>
            <Text>
              {details.code && details.code !== "0x"
                ? `${(details.code.length - 2) / 2} bytes`
                : "No deployed bytecode"}
            </Text>
            <Text fontSize="xs" color="text.secondary">
              Code presence alone does not identify an account or verify a
              contract.
            </Text>
          </Box>
          {details.code && details.code !== "0x" && (
            <Box
              as="pre"
              fontSize="xs"
              p={3}
              bg="whiteAlpha.50"
              borderRadius="md"
              maxH="16rem"
              overflow="auto"
              whiteSpace="pre-wrap"
              overflowWrap="anywhere"
              aria-label="Deployed bytecode"
            >
              {details.code}
            </Box>
          )}
        </VStack>
      )}
    </VStack>
  );
}

/** State lives beside, not inside, the loaded contract; opening cannot remount its drafts. */
export function AddressInspectorProvider({
  chainId,
  children,
}: {
  chainId: number;
  children: ReactNode;
}) {
  const [address, setAddress] = useState<Address | null>(null);
  // Chakra 2 expects a non-null RefObject type; refs are populated before focus runs.
  const returnFocusRef = useRef<HTMLButtonElement>(null!);
  const closeRef = useRef<HTMLButtonElement>(null!);
  const inspect = useCallback((next: string, trigger: HTMLButtonElement) => {
    if (!validAddress(next)) return;
    returnFocusRef.current = trigger;
    setAddress(next);
  }, []);
  return (
    <AddressInspectorContext.Provider value={inspect}>
      {children}
      <Drawer
        isOpen={address !== null}
        placement="right"
        onClose={() => setAddress(null)}
        initialFocusRef={closeRef}
        finalFocusRef={returnFocusRef}
        size="md"
        preserveScrollBarGap
      >
        <DrawerOverlay bg="blackAlpha.600" />
        <DrawerContent
          bg="bg.base"
          maxW={{ base: "100vw", md: "28rem" }}
          w="full"
          minW={0}
        >
          <DrawerCloseButton
            ref={closeRef}
            aria-label="Close address inspector"
          />
          <DrawerHeader pr={12}>Inspect address</DrawerHeader>
          <DrawerBody px={{ base: 4, md: 6 }} pb={6} overflowY="auto">
            {address && (
              <AddressDetails
                key={`${chainId}:${address}`}
                address={address}
                chainId={chainId}
              />
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </AddressInspectorContext.Provider>
  );
}
