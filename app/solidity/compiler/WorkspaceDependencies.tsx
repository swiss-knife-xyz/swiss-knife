"use client";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  HStack,
  IconButton,
  Input,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
  Tabs,
  TabList,
  Tab,
} from "@chakra-ui/react";
import {
  Download,
  ExternalLink,
  Package,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  applyDependency,
  installNpmDependency,
  removeDependency,
  latestNpmVersion,
  npmPackageUrl,
} from "@/lib/solidity/dependencies";
import {
  githubCommit,
  installGithubDependency,
} from "@/lib/solidity/githubDependencies";
import {
  githubRepositoryUrl,
  githubRoot,
  githubTarget,
} from "@/lib/solidity/githubSources";
import type { SolidityWorkspace } from "@/lib/solidity/workspace";

export function WorkspaceDependencies({
  workspace,
  update,
  disabled,
  request: openRequest,
  showTrigger = true,
  onClose: onClosed,
}: {
  workspace: SolidityWorkspace | null;
  update: (edit: (current: SolidityWorkspace) => SolidityWorkspace) => void;
  disabled: boolean;
  request?: {
    name: string;
    nonce: number;
    remove?: boolean;
    source?: "npm" | "github";
  };
  showTrigger?: boolean;
  onClose?(): void;
}) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<"npm" | "github">("npm");
  const [name, setName] = useState("@openzeppelin/contracts");
  const [version, setVersion] = useState("");
  const [busy, setBusy] = useState(false);
  const [fetchingLatest, setFetchingLatest] = useState(false);
  const [count, setCount] = useState(0);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState("");
  const request = useRef<AbortController | null>(null);
  const latestRequest = useRef<AbortController | null>(null);
  const packageUrl =
    source === "github"
      ? githubRepositoryUrl(name.trim())
      : npmPackageUrl(name.trim());
  const dependencyName =
    source === "github"
      ? packageUrl
        ? githubRoot(name.trim())
        : ""
      : name.trim();
  const cancelLatest = () => {
    latestRequest.current?.abort();
    latestRequest.current = null;
    setFetchingLatest(false);
  };
  const fetchLatest = async () => {
    if (busy || disabled || fetchingLatest || !packageUrl) return;
    const controller = new AbortController();
    latestRequest.current = controller;
    setFetchingLatest(true);
    setError("");
    try {
      const latest =
        source === "github"
          ? await githubCommit(name.trim(), "HEAD", controller.signal)
          : await latestNpmVersion(name.trim(), controller.signal);
      if (latestRequest.current === controller && !controller.signal.aborted)
        setVersion(latest);
    } catch (cause) {
      if (latestRequest.current === controller && !controller.signal.aborted)
        setError(
          cause instanceof Error
            ? cause.message
            : "Couldn't fetch the latest version."
        );
    } finally {
      if (latestRequest.current === controller) {
        latestRequest.current = null;
        setFetchingLatest(false);
      }
    }
  };
  const locked = useRef(disabled);
  locked.current = disabled;
  useEffect(
    () => () => {
      request.current?.abort();
      latestRequest.current?.abort();
    },
    []
  );
  useEffect(() => {
    if (!openRequest) return;
    cancelLatest();
    const git = githubTarget(openRequest.name);
    const target = git?.root ?? (openRequest.name || dependencyName);
    const current = workspace?.dependencies?.find((dep) => dep.name === target);
    if (
      openRequest.source === "github" ||
      git ||
      current?.source === "github"
    ) {
      setSource("github");
      setName(git?.repository ?? current?.repository ?? openRequest.name);
      setVersion(git?.reference ?? current?.version ?? "");
    } else if (openRequest.name) {
      setSource("npm");
      setName(openRequest.name);
      setVersion(current?.version ?? "");
    } else if (current) setVersion(current.version);
    setError("");
    setRemoving(openRequest.remove ? target : "");
    setOpen(true);
  }, [openRequest]);
  const close = () => {
    cancelLatest();
    request.current?.abort();
    setOpen(false);
    setError("");
    setRemoving("");
    onClosed?.();
  };
  const install = async () => {
    if (!workspace || busy || disabled || fetchingLatest) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setCount(0);
    setError("");
    try {
      const installed = await (
        source === "github" ? installGithubDependency : installNpmDependency
      )(workspace, name.trim(), version.trim(), controller.signal, setCount);
      controller.signal.throwIfAborted();
      if (locked.current)
        throw new Error(
          "Wait for the current operation to finish, then install again."
        );
      let failure: Error | undefined;
      update((current) => {
        try {
          return applyDependency(current, installed);
        } catch (cause) {
          failure = cause as Error;
          return current;
        }
      });
      if (failure) throw failure;
      close();
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(
          cause instanceof Error
            ? cause.message
            : "Couldn't install the package."
        );
    } finally {
      controller.abort();
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
      }
    }
  };
  const installed = workspace?.dependencies?.find(
    (dep) => dep.name === dependencyName
  );
  return (
    <>
      {showTrigger && (
        <IconButton
          aria-label="Manage dependencies"
          title="Dependencies"
          icon={<Package size={15} />}
          variant="ghost"
          size="xs"
          isDisabled={disabled || !workspace}
          onClick={() => {
            const current = workspace?.dependencies?.find(
              (dep) => dep.name === dependencyName
            );
            if (current) setVersion(current.version);
            setError("");
            setOpen(true);
          }}
        />
      )}
      <Modal isOpen={open} onClose={close} isCentered>
        <ModalOverlay />
        <ModalContent mx={4} bg="bg.muted">
          <ModalHeader fontSize="lg">Dependencies</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={5}>
              {!!workspace?.dependencies?.length && (
                <Stack spacing={2}>
                  {workspace.dependencies.map((dep) => (
                    <Box
                      key={dep.name}
                      borderWidth="1px"
                      borderColor="border.default"
                      rounded="lg"
                      p={3}
                    >
                      <HStack justify="space-between" minW={0}>
                        <Link
                          href={
                            dep.source === "github"
                              ? `${githubRepositoryUrl(dep.repository ?? "")}/tree/${dep.version}`
                              : npmPackageUrl(dep.name)
                          }
                          isExternal
                          fontSize="sm"
                          minW={0}
                          textAlign="left"
                        >
                          <Text isTruncated>
                            {dep.source === "github"
                              ? dep.repository
                              : dep.name}
                          </Text>
                        </Link>
                        <IconButton
                          aria-label={`Remove ${dep.name}`}
                          title="Remove dependency"
                          size="xs"
                          variant="ghost"
                          icon={<Trash2 size={14} />}
                          isDisabled={busy || disabled}
                          onClick={() => setRemoving(dep.name)}
                        />
                      </HStack>
                      <Text fontSize="xs" color="text.secondary" mt={1}>
                        <span title={dep.version}>
                          {dep.source === "github"
                            ? dep.version.slice(0, 8)
                            : dep.version}
                        </span>{" "}
                        · {dep.files.length} files · Read-only
                      </Text>
                      {removing === dep.name && (
                        <HStack justify="flex-end" mt={3}>
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => setRemoving("")}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="xs"
                            colorScheme="red"
                            onClick={() => {
                              update((current) =>
                                removeDependency(current, dep.name)
                              );
                              setRemoving("");
                            }}
                          >
                            Remove package
                          </Button>
                        </HStack>
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
              <Stack spacing={3}>
                <Tabs
                  index={source === "npm" ? 0 : 1}
                  onChange={(index) => {
                    cancelLatest();
                    setSource(index ? "github" : "npm");
                    setName(
                      index ? "Vectorized/solady" : "@openzeppelin/contracts"
                    );
                    setVersion("");
                    setError("");
                  }}
                  variant="unstyled"
                  size="sm"
                  isFitted
                  isLazy
                >
                  <TabList
                    aria-label="Dependency source"
                    display="flex"
                    gap={1}
                    p={1}
                    bg="bg.subtle"
                    borderWidth="1px"
                    borderColor="border.default"
                    rounded="lg"
                  >
                    {["npm", "GitHub"].map((label) => (
                      <Tab
                        key={label}
                        isDisabled={busy}
                        flex={1}
                        h={8}
                        px={3}
                        rounded="md"
                        fontSize="sm"
                        fontWeight="medium"
                        color="text.secondary"
                        borderWidth="1px"
                        borderColor="transparent"
                        _selected={{
                          bg: "bg.emphasis",
                          color: "text.primary",
                          borderColor: "border.default",
                          boxShadow: "sm",
                        }}
                        _hover={{ color: "text.primary" }}
                        _focusVisible={{
                          outline: "2px solid",
                          outlineColor: "primary.400",
                          outlineOffset: "2px",
                        }}
                      >
                        {label}
                      </Tab>
                    ))}
                  </TabList>
                </Tabs>
                <Box>
                  <HStack justify="space-between" mb={2}>
                    <Text as="label" htmlFor="dependency-package" fontSize="sm">
                      {source === "github" ? "Repository" : "npm package"}
                    </Text>
                    {packageUrl && (
                      <Link
                        href={packageUrl}
                        isExternal
                        display="inline-flex"
                        alignItems="center"
                        gap={1}
                        fontSize="xs"
                        color="primary.300"
                      >
                        {source === "github" ? "GitHub" : "npmjs"}{" "}
                        <ExternalLink size={12} />
                      </Link>
                    )}
                  </HStack>
                  <Input
                    id="dependency-package"
                    value={name}
                    onChange={(event) => {
                      cancelLatest();
                      setName(event.target.value);
                    }}
                    placeholder={
                      source === "github"
                        ? "Vectorized/solady"
                        : "@openzeppelin/contracts"
                    }
                    fontSize="sm"
                    isDisabled={busy}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </Box>
                <Box>
                  <HStack justify="space-between" mb={2}>
                    <Text as="label" htmlFor="dependency-version" fontSize="sm">
                      {source === "github" ? "Git reference" : "Exact version"}
                    </Text>
                    <Button
                      variant="link"
                      fontSize="xs"
                      leftIcon={<RefreshCw size={12} />}
                      onClick={() => void fetchLatest()}
                      isLoading={fetchingLatest}
                      loadingText="Fetching…"
                      isDisabled={busy || disabled || !packageUrl}
                    >
                      Fetch latest
                    </Button>
                  </HStack>
                  <Input
                    id="dependency-version"
                    value={version}
                    onChange={(event) => {
                      cancelLatest();
                      setVersion(event.target.value);
                    }}
                    placeholder={
                      source === "github"
                        ? "Commit SHA, tag or branch"
                        : "e.g. 5.4.0"
                    }
                    fontSize="sm"
                    isDisabled={busy}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </Box>
                <Text fontSize="xs" color="text.secondary">
                  {source === "github" ? (
                    <>
                      Pinned to an exact commit when installed. Sources download
                      from{" "}
                      <Link
                        href="https://github.com"
                        isExternal
                        textDecoration="underline"
                      >
                        GitHub
                      </Link>
                      .
                    </>
                  ) : (
                    <>
                      Add imports to your source, then install their
                      dependencies. Sources download from{" "}
                      <Link
                        href="https://unpkg.com"
                        isExternal
                        textDecoration="underline"
                      >
                        UNPKG
                      </Link>
                      .
                    </>
                  )}
                </Text>
              </Stack>
              {busy && (
                <Text fontSize="sm" color="text.secondary">
                  Downloading {count} {count === 1 ? "file" : "files"}…
                </Text>
              )}
              {error && (
                <Alert status="error" rounded="lg" fontSize="sm">
                  <AlertIcon />
                  {error}
                </Alert>
              )}
            </Stack>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" size="sm" onClick={close}>
              {busy ? "Cancel" : "Close"}
            </Button>
            <Button
              size="sm"
              colorScheme="primary"
              leftIcon={<Download size={15} />}
              onClick={() => void install()}
              isLoading={busy}
              isDisabled={
                disabled || fetchingLatest || !name.trim() || !version.trim()
              }
            >
              {installed ? "Update imports" : "Install"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
