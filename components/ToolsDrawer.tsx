"use client";

import {
  useEffect,
  useRef,
  useState,
  type RefObject,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Box,
  Flex,
  Text,
  Link as ChakraLink,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerHeader,
  DrawerBody,
} from "@chakra-ui/react";
import { ChevronDown, Search } from "lucide-react";
import {
  getFilteredToolNavigation,
  matchesToolQuery,
  toolHref,
} from "@/lib/toolNavigation";

export function ToolsNavigation({
  query = "",
  selectedHref,
  onNavigate,
}: {
  query?: string;
  selectedHref?: string | null;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const [location, setLocation] = useState<string>();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  useEffect(() => setLocation(window.location.href), [pathname]);
  const current = (href: string) => {
    if (!location) return false;
    const target = new URL(href, location),
      actual = new URL(location);
    return (
      target.origin === actual.origin &&
      target.pathname.replace(/\/$/, "") === actual.pathname.replace(/\/$/, "")
    );
  };
  const search = query.trim().toLowerCase();
  const matches = (...values: string[]) => matchesToolQuery(query, ...values);
  const categories = getFilteredToolNavigation(query);
  const firstTool = categories[0]?.tools[0];
  const firstMatch =
    firstTool &&
    (matches(firstTool.info.label, firstTool.subdomain, firstTool.path ?? "")
      ? toolHref(firstTool)
      : firstTool.children[0] &&
        toolHref(firstTool, firstTool.children[0].path));
  const highlightedHref = selectedHref ?? (search ? firstMatch : undefined);
  return (
    <Box as="nav" aria-label="All tools">
      {categories.map((category) => (
        <Box
          as="section"
          key={category.id}
          aria-labelledby={`tools-${category.id}`}
          pt={5}
        >
          <Text
            as="h2"
            id={`tools-${category.id}`}
            px={3}
            mb={2}
            fontSize="xs"
            fontWeight="semibold"
            color="text.secondary"
            letterSpacing="0.06em"
            textTransform="uppercase"
          >
            {category.label}
          </Text>
          {category.tools.map((tool) => {
            const href = toolHref(tool),
              active = current(href);
            const isExpanded = Boolean(search) || expanded.has(tool.id);
            const panelId = `tool-pages-${tool.subdomain}`;
            return (
              <Box key={tool.id}>
                <Flex align="center" gap={1}>
                  <ChakraLink
                    as={Link}
                    href={href}
                    data-tool-href={href}
                    data-tool-result={
                      !search ||
                      matches(tool.info.label, tool.subdomain, tool.path ?? "")
                        ? ""
                        : undefined
                    }
                    onClick={onNavigate}
                    flex={1}
                    minW={0}
                    display="flex"
                    alignItems="center"
                    minH={10}
                    px={3}
                    py={2}
                    rounded="md"
                    fontSize="sm"
                    fontWeight={active ? "semibold" : "medium"}
                    color={active ? "primary.300" : "text.primary"}
                    data-keyboard-selected={
                      highlightedHref === href || undefined
                    }
                    bg={
                      active || highlightedHref === href
                        ? "bg.emphasis"
                        : "transparent"
                    }
                    aria-current={active ? "page" : undefined}
                    _hover={{ bg: "bg.emphasis", textDecoration: "none" }}
                    _focusVisible={{
                      boxShadow: "none",
                      outline: "none",
                      bg: "bg.emphasis",
                      color: "text.primary",
                    }}
                  >
                    {tool.info.label}
                  </ChakraLink>
                  {tool.children.length > 0 && !search && (
                    <IconButton
                      aria-label={`Show ${tool.info.label} pages`}
                      aria-expanded={isExpanded}
                      aria-controls={panelId}
                      icon={
                        <ChevronDown
                          size={16}
                          style={{
                            transform: isExpanded
                              ? "rotate(180deg)"
                              : undefined,
                          }}
                        />
                      }
                      onClick={() =>
                        setExpanded((previous) => {
                          const next = new Set(previous);
                          next.has(tool.id)
                            ? next.delete(tool.id)
                            : next.add(tool.id);
                          return next;
                        })
                      }
                      variant="ghost"
                      size="sm"
                      w={9}
                      h={9}
                      flexShrink={0}
                      color="text.secondary"
                      _hover={{ bg: "bg.emphasis", color: "text.primary" }}
                    />
                  )}
                </Flex>
                {tool.children.length > 0 && isExpanded && (
                  <Box
                    id={panelId}
                    ml={4}
                    pl={2}
                    borderLeftWidth="1px"
                    borderColor="border.default"
                    my={1}
                  >
                    {tool.children.map((child) => {
                      const childHref = toolHref(tool, child.path),
                        childActive = current(childHref);
                      return (
                        <ChakraLink
                          as={Link}
                          key={child.path}
                          href={childHref}
                          data-tool-href={childHref}
                          data-tool-result=""
                          onClick={onNavigate}
                          display="flex"
                          alignItems="center"
                          minH={9}
                          px={3}
                          py={2}
                          rounded="md"
                          fontSize="sm"
                          color={childActive ? "primary.300" : "text.secondary"}
                          aria-current={childActive ? "page" : undefined}
                          data-keyboard-selected={
                            highlightedHref === childHref || undefined
                          }
                          bg={
                            highlightedHref === childHref
                              ? "bg.emphasis"
                              : "transparent"
                          }
                          _hover={{
                            bg: "bg.emphasis",
                            color: "text.primary",
                            textDecoration: "none",
                          }}
                          _focusVisible={{
                            boxShadow: "none",
                            outline: "none",
                            bg: "bg.emphasis",
                            color: "text.primary",
                          }}
                        >
                          {child.label}
                        </ChakraLink>
                      );
                    })}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      ))}
      {!categories.length && (
        <Text px={3} py={8} fontSize="sm" color="text.secondary">
          No tools found.
        </Text>
      )}
    </Box>
  );
}

export function ToolsDrawer({
  isOpen,
  onClose,
  searchRef: suppliedSearchRef,
}: {
  isOpen: boolean;
  onClose: () => void;
  searchRef?: RefObject<HTMLInputElement>;
}) {
  const [query, setQuery] = useState("");
  const [selectedHref, setSelectedHref] = useState<string | null>(null);
  const localSearchRef = useRef<HTMLInputElement>(null!);
  const searchRef = suppliedSearchRef ?? localSearchRef;
  const resultsRef = useRef<HTMLDivElement>(null);
  const navigateResults = (event: KeyboardEvent) => {
    if (
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    )
      return;
    const target = event.target as HTMLElement;
    const fromSearch = target === searchRef.current;
    if (!fromSearch && target.tagName !== "A") return;
    // Next.js can normalize rendered hrefs (for example, removing a trailing
    // slash). Keep selection tied to the original href used for highlighting.
    const links = Array.from(
      resultsRef.current?.querySelectorAll<HTMLAnchorElement>(
        "a[href][data-tool-result]"
      ) ?? []
    );
    if (!links.length) return;
    if (event.key === "Enter" && fromSearch) {
      event.preventDefault();
      (
        links.find((link) => link.getAttribute("data-tool-href") === selectedHref) ??
        links[0]
      ).click();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const selectedIndex = links.findIndex(
      (link) => link.getAttribute("data-tool-href") === selectedHref
    );
    const current = fromSearch
      ? selectedIndex >= 0
        ? selectedIndex
        : query.trim()
          ? 0
          : -1
      : links.indexOf(target as HTMLAnchorElement);
    const next =
      current < 0
        ? event.key === "ArrowDown"
          ? 0
          : links.length - 1
        : (current + (event.key === "ArrowDown" ? 1 : -1) + links.length) %
          links.length;
    setSelectedHref(links[next].getAttribute("data-tool-href"));
    searchRef.current?.focus({ preventScroll: true });
    links[next].scrollIntoView?.({ block: "nearest" });
  };
  const close = () => {
    setQuery("");
    setSelectedHref(null);
    onClose();
  };
  return (
    <Drawer
      isOpen={isOpen}
      placement="right"
      onClose={close}
      initialFocusRef={searchRef}
    >
      <DrawerOverlay backdropFilter="blur(8px)" bg="blackAlpha.600" />
      <DrawerContent
        onKeyDown={navigateResults}
        motionProps={{
          onAnimationComplete: () => {
            if (isOpen) searchRef.current?.focus({ preventScroll: true });
          },
        }}
        bg="bg.base"
        w="full"
        maxW={{ base: "100vw", sm: "380px" }}
        h="100dvh"
      >
        <DrawerCloseButton
          top={4}
          right={4}
          color="text.secondary"
          _hover={{ color: "text.primary", bg: "bg.emphasis" }}
        />
        <DrawerHeader
          px={5}
          pt={5}
          pb={4}
          borderBottomWidth="1px"
          borderColor="border.subtle"
        >
          <Text fontSize="lg" fontWeight="semibold" color="text.primary" mb={4}>
            All Tools
          </Text>
          <InputGroup size="sm">
            <InputLeftElement pointerEvents="none" h={10} color="text.tertiary">
              <Search size={16} />
            </InputLeftElement>
            <Input
              ref={searchRef}
              aria-label="Find a tool"
              placeholder="Find a tool…"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedHref(null);
              }}
              h={10}
              bg="bg.subtle"
              rounded="md"
              autoComplete="off"
              spellCheck={false}
              fontWeight="normal"
            />
          </InputGroup>
        </DrawerHeader>
        <DrawerBody
          px={3}
          pt={0}
          pb="max(24px, env(safe-area-inset-bottom))"
          overscrollBehavior="contain"
        >
          <Box
            ref={resultsRef}
            onFocusCapture={(event) => {
              const target = event.target as HTMLElement;
              if (target.matches("a[data-tool-result]"))
                setSelectedHref(target.getAttribute("data-tool-href"));
            }}
          >
            {isOpen && (
              <ToolsNavigation
                query={query}
                selectedHref={selectedHref}
                onNavigate={close}
              />
            )}
          </Box>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
