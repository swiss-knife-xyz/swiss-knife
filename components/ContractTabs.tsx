"use client";

import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import NextLink from "next/link";
import {
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  HStack,
  Heading,
  Icon,
  IconButton,
  Image,
  Link,
  Spinner,
  Text,
  VStack,
  type LinkProps,
} from "@chakra-ui/react";
import { FiLayers, FiPlus, FiX } from "react-icons/fi";
import { isAddress } from "viem";
import { chainIdToChain, chainIdToImage } from "@/data/common";
import { getPublicClient } from "@/lib/publicClient";
import { getPath, slicedText } from "@/utils";

const ContractStart = dynamic(() => import("./ContractStart"), {
  loading: () => <Spinner size="sm" />,
});

const AddressExplorer = dynamic(() => import("./ContractAddressExplorer"), {
  loading: () => <Spinner size="sm" />,
});

export type ContractTabAddress = { address: string; chainId: number };
type AddressTab = ContractTabAddress & {
  kind?: "address";
  id: string;
  name?: string;
  initial?: boolean;
  checkCode?: boolean;
};
type StartTab = {
  id: string;
  kind: "new";
  chainId: number;
  address?: never;
  name?: never;
  initial?: never;
};
type Tab = AddressTab | StartTab;
type TabContext = {
  chainId: number;
  initial: boolean;
  openAddress: (address: string, chainId: number, displayName?: string) => void;
  setName: (name: string) => void;
};
const ContractTabContext = createContext<TabContext | null>(null);
export const useContractTab = () => useContext(ContractTabContext);
export const CONTRACT_TABS_STORAGE_KEY = "contract-explorer-tabs";

const keyFor = ({ address, chainId }: ContractTabAddress) =>
  `${chainId}:${address.toLowerCase()}`;

// Address controls open workspace tabs here and remain ordinary links elsewhere.
export const ContractAddressLink = forwardRef<
  HTMLAnchorElement,
  LinkProps & { address: string; chainId?: number; displayName?: string }
>(function ContractAddressLink(
  { address, chainId, displayName, onClick, children, ...props },
  ref
) {
  const tab = useContractTab();
  const opensTab = Boolean(tab && isAddress(address));
  return (
    <Link
      {...props}
      as={opensTab ? "button" : "a"}
      type={opensTab ? "button" : undefined}
      href={opensTab ? undefined : props.href}
      target={opensTab ? undefined : props.target}
      isExternal={opensTab ? false : props.isExternal}
      rel={opensTab ? undefined : props.rel}
      ref={ref}
      onClick={(event) => {
        onClick?.(event);
        if (
          !tab ||
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          !isAddress(address)
        )
          return;
        event.preventDefault();
        tab.openAddress(address, chainId ?? tab.chainId, displayName);
      }}
    >
      {children}
    </Link>
  );
});

function AddressPanel({
  tab,
  renderContract,
  onChainChange,
}: {
  tab: AddressTab;
  renderContract: (params: ContractTabAddress) => ReactNode;
  onChainChange: (chainId: number) => void;
}) {
  const [kind, setKind] = useState<
    "loading" | "contract" | "address" | "error"
  >(tab.initial && !tab.checkCode ? "contract" : "loading");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (tab.initial && !tab.checkCode) return;
    let active = true;
    setKind("loading");
    void (async () => {
      try {
        const code = await getPublicClient(tab.chainId).getCode({
          address: tab.address as `0x${string}`,
        });
        if (active) setKind(code && code !== "0x" ? "contract" : "address");
      } catch {
        if (active) setKind("error");
      }
    })();
    return () => {
      active = false;
    };
  }, [tab.address, tab.chainId, tab.initial, tab.checkCode, revision]);
  if (kind === "loading")
    return (
      <HStack role="status" py={6}>
        <Spinner size="sm" />
        <Text fontSize="sm" color="text.secondary">
          Loading address…
        </Text>
      </HStack>
    );
  if (kind === "error")
    return (
      <VStack align="start" py={6} spacing={3}>
        <Text color="text.secondary">
          Unable to load this address on {chainIdToChain[tab.chainId]?.name}.
        </Text>
        <Button size="sm" onClick={() => setRevision((value) => value + 1)}>
          Retry
        </Button>
      </VStack>
    );
  return kind === "contract" ? (
    renderContract(tab)
  ) : (
    <AddressExplorer
      address={tab.address}
      chainId={tab.chainId}
      onChainChange={onChainChange}
    />
  );
}

function TabPanel({
  tab,
  active,
  openAddress,
  onName,
  onStartOpen,
  renderContract,
}: {
  tab: Tab;
  active: boolean;
  openAddress: TabContext["openAddress"];
  onName: (id: string, name: string) => void;
  onStartOpen: (id: string, address: string, chainId: number) => void;
  renderContract: (params: ContractTabAddress) => ReactNode;
}) {
  const setName = useCallback(
    (name: string) => onName(tab.id, name),
    [onName, tab.id]
  );
  const context = useMemo(
    () => ({
      chainId: tab.chainId,
      initial: Boolean(tab.initial),
      openAddress,
      setName,
    }),
    [tab.chainId, tab.initial, openAddress, setName]
  );
  return (
    <Box
      id={`address-panel-${tab.id}`}
      role="tabpanel"
      aria-labelledby={`address-tab-${tab.id}`}
      tabIndex={-1}
      hidden={!active}
      minW={0}
    >
      <ContractTabContext.Provider value={context}>
        {tab.kind === "new" ? (
          <ContractStart
            embedded
            initialChainId={tab.chainId}
            onOpen={(address, chainId) => onStartOpen(tab.id, address, chainId)}
          />
        ) : (
          <AddressPanel
            tab={tab}
            renderContract={renderContract}
            onChainChange={(chainId) =>
              onStartOpen(tab.id, tab.address, chainId)
            }
          />
        )}
      </ContractTabContext.Provider>
    </Box>
  );
}

export function ContractTabs({
  initial,
  renderContract,
}: {
  initial?: ContractTabAddress;
  renderContract: (params: ContractTabAddress) => ReactNode;
}) {
  const initialTab = useRef<Tab>(
    initial
      ? { ...initial, id: keyFor(initial), initial: true }
      : { id: "new:1", kind: "new", chainId: 1 }
  ).current;
  const [tabs, setTabs] = useState<Tab[]>(() => [initialTab]);
  const [active, setActive] = useState(initialTab.id);
  const [storageReady, setStorageReady] = useState(false);
  const replaceNextUrl = useRef(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const nextTab = useRef(initial ? 0 : 1);
  const scrollPositions = useRef(new Map<string, number>());
  const activeRef = useRef(active);
  const restoredTab = useRef(active);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const tabUrls = useRef(new Map<string, string>());
  const knownTabs = useRef(new Map<string, Tab>());
  const historySelection = useRef<string | null>(null);
  const urlTab = useRef(active);
  const select = useCallback((id: string) => {
    if (id !== activeRef.current) {
      scrollPositions.current.set(activeRef.current, window.scrollY);
      tabUrls.current.set(activeRef.current, window.location.href);
      activeRef.current = id;
      setActive(id);
    }
    setMobileOpen(false);
  }, []);
  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(CONTRACT_TABS_STORAGE_KEY) ?? "null"
      );
      if (
        saved?.version === 1 &&
        Array.isArray(saved.tabs) &&
        saved.tabs.length > 1
      ) {
        const seen = new Set<string>();
        const restored: Tab[] = [];
        for (const item of saved.tabs) {
          if (
            !item ||
            !Number.isInteger(item.chainId) ||
            !chainIdToChain[item.chainId]
          )
            continue;
          let tab: Tab;
          if (
            item.kind === "new" &&
            typeof item.id === "string" &&
            /^new:[1-9]\d*$/.test(item.id)
          ) {
            nextTab.current = Math.max(
              nextTab.current,
              Number(item.id.slice(4))
            );
            tab = { id: item.id, kind: "new", chainId: item.chainId };
          } else if (
            typeof item.address === "string" &&
            isAddress(item.address)
          ) {
            const id = keyFor(item);
            tab = {
              id,
              address: item.address,
              chainId: item.chainId,
              checkCode: true,
              ...(typeof item.name === "string" ? { name: item.name } : {}),
              ...(initial && id === initialTab.id ? { initial: true } : {}),
            };
          } else continue;
          if (!seen.has(tab.id)) {
            seen.add(tab.id);
            restored.push(tab);
          }
        }
        if (restored.length > 1) {
          if (initial && !seen.has(initialTab.id)) restored.push(initialTab);
          const selected = initial
            ? initialTab.id
            : (restored.find((tab) => tab.id === saved.active)?.id ??
              restored[0].id);
          replaceNextUrl.current = selected !== initialTab.id;
          activeRef.current = selected;
          setTabs(restored);
          setActive(selected);
        }
      }
    } catch {
      // Storage may be unavailable or contain an older/corrupt workspace.
    }
    setStorageReady(true);
  }, []);
  useEffect(() => {
    if (!storageReady) return;
    try {
      if (tabs.length > 1) {
        localStorage.setItem(
          CONTRACT_TABS_STORAGE_KEY,
          JSON.stringify({
            version: 1,
            active,
            tabs: tabs.map((tab) =>
              tab.kind === "new"
                ? { id: tab.id, kind: "new", chainId: tab.chainId }
                : { address: tab.address, chainId: tab.chainId, name: tab.name }
            ),
          })
        );
      } else localStorage.removeItem(CONTRACT_TABS_STORAGE_KEY);
    } catch {
      // Keep the workspace usable if browser storage is full or disabled.
    }
  }, [tabs, active, storageReady]);
  useEffect(() => {
    tabUrls.current.set(initialTab.id, window.location.href);
    window.history.replaceState(
      { ...window.history.state, contractWorkspaceTab: initialTab.id },
      "",
      window.location.href
    );
    const restore = (event: PopStateEvent) => {
      const id = event.state?.contractWorkspaceTab;
      const tab =
        typeof id === "string" ? knownTabs.current.get(id) : undefined;
      if (!tab) return;
      historySelection.current = id;
      // The browser has already changed the URL; retain the departing tab's saved URL.
      scrollPositions.current.set(activeRef.current, window.scrollY);
      activeRef.current = id;
      setTabs((previous) =>
        previous.some((item) => item.id === id) ? previous : [...previous, tab]
      );
      setActive(id);
      setMobileOpen(false);
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  useEffect(() => {
    tabs.forEach((tab) => knownTabs.current.set(tab.id, tab));
    if (urlTab.current === active) return;
    urlTab.current = active;
    if (historySelection.current === active) {
      historySelection.current = null;
      return;
    }
    const tab = tabs.find((item) => item.id === active);
    if (!tab) return;
    const base = new URL(getPath("explorer"), window.location.origin);
    const target =
      tabUrls.current.get(active) ??
      (tab.kind === "new"
        ? base.href
        : new URL(`${tab.chainId}/${tab.address}`, base).href);
    const method = replaceNextUrl.current ? "replaceState" : "pushState";
    replaceNextUrl.current = false;
    window.history[method](
      { ...window.history.state, contractWorkspaceTab: active },
      "",
      target
    );
    tabUrls.current.set(active, window.location.href);
  }, [active, tabs]);
  const openAddress = useCallback(
    (address: string, chainId: number, displayName?: string) => {
      if (!isAddress(address) || !chainIdToChain[chainId]) return;
      const id = keyFor({ address, chainId });
      const name = displayName?.trim();
      setTabs((previous) =>
        previous.some((tab) => tab.id === id)
          ? previous.map((tab) =>
              tab.kind !== "new" && tab.id === id && !tab.name && name
                ? { ...tab, name }
                : tab
            )
          : [...previous, { id, address, chainId, ...(name ? { name } : {}) }]
      );
      select(id);
      requestAnimationFrame(() =>
        document
          .getElementById(`address-panel-${id}`)
          ?.focus({ preventScroll: true })
      );
    },
    [select]
  );
  const addTab = () => {
    const id = `new:${++nextTab.current}`;
    const chainId =
      tabs.find((tab) => tab.id === active)?.chainId ?? initialTab.chainId;
    setTabs((previous) => [...previous, { id, kind: "new", chainId }]);
    select(id);
    requestAnimationFrame(() =>
      document
        .getElementById(`address-panel-${id}`)
        ?.querySelector<HTMLInputElement>("input")
        ?.focus({ preventScroll: true })
    );
  };
  const onStartOpen = useCallback(
    (draftId: string, address: string, chainId: number) => {
      if (!isAddress(address) || !chainIdToChain[chainId]) return;
      const id = keyFor({ address, chainId });
      if (id === draftId) return;
      setTabs((previous) =>
        previous.some((tab) => tab.id === id)
          ? previous.filter((tab) => tab.id !== draftId)
          : previous.map((tab) =>
              tab.id === draftId ? { id, address, chainId } : tab
            )
      );
      select(id);
      scrollPositions.current.delete(draftId);
      requestAnimationFrame(() =>
        document
          .getElementById(`address-panel-${id}`)
          ?.focus({ preventScroll: true })
      );
    },
    [select]
  );
  const onName = useCallback((id: string, name: string) => {
    if (
      !name.trim() ||
      isAddress(name.trim()) ||
      /^0x[\da-f]+(?:\.{3}|…)[\da-f]+$/i.test(name.trim())
    )
      return;
    setTabs((previous) =>
      previous.some((tab) => tab.id === id && tab.name !== name)
        ? previous.map((tab) =>
            tab.id === id && tab.kind !== "new" ? { ...tab, name } : tab
          )
        : previous
    );
  }, []);
  useLayoutEffect(() => {
    if (restoredTab.current === active) return;
    restoredTab.current = active;
    const frame = requestAnimationFrame(() => {
      window.scrollTo({
        top:
          scrollPositions.current.get(active) ??
          Math.max(
            0,
            (workspaceRef.current?.getBoundingClientRect().top ?? 0) +
              window.scrollY -
              16
          ),
        behavior: "instant",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [active]);
  const close = (id: string) => {
    const index = tabs.findIndex((tab) => tab.id === id);
    if (tabs.length === 1 || index < 0) return;
    if (active === id) select(tabs[index - 1]?.id ?? tabs[index + 1].id);
    scrollPositions.current.delete(id);
    setTabs((previous) => previous.filter((tab) => tab.id !== id));
    requestAnimationFrame(() =>
      document
        .getElementById(`address-panel-${activeRef.current}`)
        ?.focus({ preventScroll: true })
    );
  };
  const closeAll = () => {
    const tab: StartTab = {
      id: `new:${++nextTab.current}`,
      kind: "new",
      chainId: tabs.find((item) => item.id === active)?.chainId ?? 1,
    };
    scrollPositions.current.clear();
    tabUrls.current.clear();
    select(tab.id);
    setTabs([tab]);
  };
  const tabList = (mobile = false) => (
    <>
      <VStack
        role="tablist"
        aria-label="Tabs"
        aria-orientation="vertical"
        align="stretch"
        spacing={1}
        onKeyDown={(event) => {
          if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key))
            return;
          event.preventDefault();
          const index = tabs.findIndex((tab) => tab.id === active);
          const next =
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? tabs.length - 1
                : (index + (event.key === "ArrowDown" ? 1 : -1) + tabs.length) %
                  tabs.length;
          select(tabs[next].id);
          event.currentTarget
            .querySelectorAll<HTMLButtonElement>('[role="tab"]')
            [next]?.focus();
        }}
      >
        {tabs.map((tab) => (
          <HStack
            key={tab.id}
            spacing={0}
            minW={0}
            rounded="md"
            position="relative"
            bg={tab.id === active ? "bg.muted" : "transparent"}
          >
            <Button
              id={mobile ? undefined : `address-tab-${tab.id}`}
              role="tab"
              aria-selected={tab.id === active}
              aria-controls={`address-panel-${tab.id}`}
              tabIndex={tab.id === active ? 0 : -1}
              onClick={() => select(tab.id)}
              variant="ghost"
              w="full"
              minW={0}
              h="auto"
              pl={2}
              pr={tabs.length > 1 ? 9 : 2}
              py={2.5}
              justifyContent="start"
              whiteSpace="normal"
              title={tab.address}
            >
              <VStack align="start" minW={0} w="full" spacing={0.5}>
                <Text
                  fontSize="sm"
                  fontWeight={tab.id === active ? "semibold" : "medium"}
                  maxW="full"
                  lineHeight="20px"
                  isTruncated
                >
                  {tab.kind === "new"
                    ? "New tab"
                    : tab.name || slicedText(tab.address)}
                </Text>
                {tab.name &&
                  !isAddress(tab.name) &&
                  !/^0x[\da-f]+(?:\.{3}|…)[\da-f]+$/i.test(tab.name.trim()) && (
                    <Text
                      fontSize="xs"
                      fontFamily="mono"
                      fontWeight="normal"
                      lineHeight="18px"
                      color="text.secondary"
                      maxW="full"
                      isTruncated
                    >
                      {slicedText(tab.address)}
                    </Text>
                  )}
                {tab.kind !== "new" && (
                  <HStack spacing={1.5} minW={0} align="center" pt={0.5}>
                    <Image
                      src={chainIdToImage[tab.chainId]}
                      alt=""
                      boxSize="12px"
                      rounded="full"
                      objectFit="contain"
                      flexShrink={0}
                    />
                    <Text
                      fontSize="11px"
                      fontWeight="normal"
                      lineHeight="16px"
                      color="text.secondary"
                      isTruncated
                    >
                      {chainIdToChain[tab.chainId]?.name}
                    </Text>
                  </HStack>
                )}
              </VStack>
            </Button>
            {tabs.length > 1 && (
              <IconButton
                aria-label={
                  tab.kind === "new"
                    ? `Close new tab ${tab.id.split(":")[1]}`
                    : `Close ${tab.address} on ${chainIdToChain[tab.chainId]?.name}`
                }
                icon={<FiX />}
                onClick={() => close(tab.id)}
                variant="ghost"
                size="xs"
                position="absolute"
                right={1}
                top={2}
                color="text.secondary"
                zIndex={1}
              />
            )}
          </HStack>
        ))}
      </VStack>
      {tabs.length > 1 && (
        <Button
          onClick={closeAll}
          size="xs"
          variant="ghost"
          color="text.secondary"
          justifyContent="start"
          w="full"
          mt={2}
          leftIcon={<FiX />}
        >
          Close all tabs
        </Button>
      )}
    </>
  );
  return (
    <Box
      ref={workspaceRef}
      display="grid"
      gridTemplateColumns={{
        base: "minmax(0, 1fr)",
        md: "176px minmax(0, 1fr)",
        xl: "208px minmax(0, 1fr)",
      }}
      gap={{ base: 3, md: 5 }}
      minW={0}
      alignItems="start"
    >
      <Box
        as="aside"
        display={{ base: "none", md: "block" }}
        position="sticky"
        top={4}
        minW={0}
        maxH="calc(100dvh - 2rem)"
        overflowY="auto"
      >
        <HStack justify="space-between" mb={2} pl={2} pr={1}>
          <Text fontSize="xs" color="text.secondary">
            Tabs
          </Text>
          <IconButton
            aria-label="New address tab"
            icon={<FiPlus />}
            size="xs"
            variant="ghost"
            onClick={addTab}
          />
        </HStack>
        {tabList()}
      </Box>
      <Box minW={0}>
        <HStack justify="space-between" flexWrap="wrap" mb={4} gap={2}>
          <Heading
            as="h1"
            fontSize={{ base: "xl", md: "2xl" }}
            mb={0}
            color="custom.pale"
          >
            <Link
              as={NextLink}
              href={getPath("explorer")}
              color="inherit"
              _hover={{ opacity: 0.8, textDecoration: "none" }}
            >
              Contract Explorer
            </Link>
          </Heading>
          <Link
            as={NextLink}
            href={getPath("explorers")}
            fontSize="sm"
            color="text.secondary"
            ml="auto"
          >
            Explorer Directory
          </Link>
        </HStack>
        <Button
          display={{ base: "inline-flex", md: "none" }}
          size="sm"
          variant="ghost"
          position="sticky"
          top={2}
          zIndex={2}
          bg="bg.subtle"
          leftIcon={<FiLayers />}
          mb={3}
          onClick={() => setMobileOpen(true)}
        >
          Tabs ({tabs.length})
        </Button>
        {tabs.map((tab) => (
          <TabPanel
            key={tab.id}
            tab={tab}
            active={tab.id === active}
            openAddress={openAddress}
            onName={onName}
            onStartOpen={onStartOpen}
            renderContract={renderContract}
          />
        ))}
      </Box>
      <Drawer
        isOpen={mobileOpen}
        placement="left"
        onClose={() => setMobileOpen(false)}
      >
        <DrawerOverlay />
        <DrawerContent bg="bg.base" maxW="280px">
          <DrawerHeader fontSize="md" px={3} py={3}>
            <HStack justify="space-between" spacing={2}>
              <Text pl={2}>Tabs</Text>
              <HStack spacing={1}>
                <IconButton
                  aria-label="New address tab"
                  icon={<FiPlus />}
                  size="sm"
                  variant="ghost"
                  onClick={addTab}
                />
                <IconButton
                  aria-label="Close tabs drawer"
                  icon={<FiX />}
                  size="sm"
                  variant="ghost"
                  onClick={() => setMobileOpen(false)}
                />
              </HStack>
            </HStack>
          </DrawerHeader>
          <DrawerBody px={3}>{tabList(true)}</DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
}
