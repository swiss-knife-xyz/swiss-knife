import {
  lazy,
  Suspense,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Box,
  Button,
  HStack,
  Link,
  Skeleton,
  Spinner,
  Text,
  useToken,
} from "@chakra-ui/react";
import { ExternalLink, RotateCw } from "lucide-react";
import axios from "axios";
import { resolveIPFS } from "@/utils";
import { PlainStringValue } from "./StringValue";
import { CopyToClipboard } from "../CopyToClipboard";
import { ResizableImage } from "../ResizableImage";
import { ExampleSnapshotContext } from "./ExampleSnapshotContext";
import { analyzeString, isImageUrl, parseJsonContent } from "./stringContent";
import { RichJsonContent } from "./RichJsonContent";

const RichCodeEditor = lazy(() =>
  import("../ContentSizedEditor").then((module) => ({
    default: module.ContentSizedEditor,
  }))
);

interface Params {
  value: string | null;
  chainId?: number;
  disableRich?: boolean;
  inlinePreview?: boolean;
}

// A new value or snapshot starts with its own preview and disclosure state.
export const StringParam = (props: Params) => {
  const example = useContext(ExampleSnapshotContext);
  return (
    <StringParamContent
      key={JSON.stringify([props.value, props.chainId, !!example])}
      {...props}
    />
  );
};

function StringParamContent({
  value: suppliedValue,
  chainId,
  disableRich,
  inlinePreview,
}: Params) {
  const value = suppliedValue ?? "";
  const [editorBackground] = useToken("colors", ["bg.subtle"]);
  const example = useContext(ExampleSnapshotContext);
  const content = useMemo(() => analyzeString(value), [value]);
  const captured = example?.urls[value];
  const [remote, setRemote] = useState<{
    json?: Record<string, unknown> | unknown[];
    image?: string;
  }>();
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [attempt, setAttempt] = useState(0);
  const [view, setView] = useState<"preview" | "raw" | "original">("preview");
  const directImage =
    content.image ?? (isImageUrl(value) ? resolveIPFS(value) : undefined);

  useEffect(() => {
    if (example || disableRich || !content.isUrl || directImage) return;
    let cancelled = false;
    setStatus("loading");
    setRemote(undefined);
    axios
      .get(resolveIPFS(value))
      .then((response) => {
        if (cancelled) return;
        const json = parseJsonContent(response.data);
        if (json !== undefined) setRemote({ json });
        else if (
          String(response.headers?.["content-type"] ?? "").startsWith("image/")
        )
          setRemote({ image: resolveIPFS(value) });
        else {
          setStatus("error");
          return;
        }
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [value, content.isUrl, directImage, example, disableRich, attempt]);

  const json =
    content.json ?? (example ? parseJsonContent(captured?.json) : remote?.json);
  const image = example
    ? (captured?.image ?? content.image)
    : (directImage ?? remote?.image);
  const raw = useMemo(
    () => (json !== undefined ? JSON.stringify(json, null, 2) : content.svg),
    [json, content.svg]
  );
  const rich = !disableRich && (content.isUrl || json !== undefined || image);
  const pending =
    !example && content.isUrl && !directImage && status === "loading";
  const unavailable = content.isUrl && !json && !image && !pending;
  const selectedText = view === "original" || !raw ? value : raw;

  if (suppliedValue == null)
    return <Skeleton h="32px" w="full" rounded="4px" />;
  if (!rich) return <PlainStringValue value={value} />;

  const preview =
    json !== undefined ? (
      <RichJsonContent value={json} chainId={chainId} />
    ) : image ? (
      <ResizableImage
        src={image}
        maxInitialWidth={320}
        maxInitialHeight={280}
      />
    ) : (
      <Box>
        <PlainStringValue value={value} />
        {pending && (
          <HStack mt={2} spacing={2} color="text.tertiary">
            <Spinner size="xs" />
            <Text fontSize="xs">Loading preview…</Text>
          </HStack>
        )}
        {unavailable && (
          <HStack mt={2} justify="space-between">
            <Text fontSize="xs" color="text.tertiary">
              Preview unavailable
            </Text>
            {!example && (
              <Button
                variant="ghost"
                size="xs"
                leftIcon={<RotateCw size={12} />}
                onClick={() => setAttempt((n) => n + 1)}
              >
                Retry
              </Button>
            )}
          </HStack>
        )}
      </Box>
    );
  if (inlinePreview)
    return (
      <Box minW={0}>
        {preview}
        {image && content.isUrl && (
          <HStack mt={1} justify="flex-end">
            <Link
              href={resolveIPFS(value)}
              isExternal
              fontSize="xs"
              color="text.secondary"
            >
              Open image{" "}
              <ExternalLink size={11} style={{ display: "inline" }} />
            </Link>
            <CopyToClipboard
              textToCopy={value}
              size="xs"
              aria-label="Copy image URL"
            />
          </HStack>
        )}
      </Box>
    );

  return (
    <Box
      className="rich-string-viewer"
      w="full"
      minW={0}
      border="1px solid"
      borderColor="border.default"
      borderRadius="4px"
      bg="bg.subtle"
      sx={{ containerType: "inline-size", containerName: "rich-string" }}
    >
      <HStack
        px={2}
        minH="40px"
        gap={1}
        justify="space-between"
        borderBottom="1px solid"
        borderColor="border.default"
        flexWrap="wrap"
      >
        <HStack spacing={0.5} role="group" aria-label="String output views">
          {(
            [
              { id: "preview", label: "Preview" },
              ...(raw
                ? [
                    {
                      id: "raw",
                      label: json !== undefined ? "Raw JSON" : "Raw SVG",
                    },
                  ]
                : []),
              { id: "original", label: "Original" },
            ] as const
          ).map((tab) => (
            <Button
              key={tab.id}
              variant="ghost"
              size="xs"
              h={7}
              px={2}
              borderRadius="3px"
              fontWeight="medium"
              color={view === tab.id ? "text.primary" : "text.secondary"}
              bg={view === tab.id ? "whiteAlpha.100" : "transparent"}
              aria-pressed={view === tab.id}
              onClick={() => setView(tab.id as typeof view)}
            >
              {tab.label}
            </Button>
          ))}
        </HStack>
        <HStack spacing={0.5}>
          <CopyToClipboard
            textToCopy={selectedText}
            size="xs"
            h={7}
            minW={7}
            borderRadius="3px"
            aria-label={
              view === "original"
                ? "Copy original string"
                : raw
                  ? "Copy decoded content"
                  : "Copy string"
            }
          />
          {content.isUrl && (
            <Button
              as={Link}
              href={resolveIPFS(value)}
              isExternal
              aria-label="Open source URL"
              title="Open source URL"
              variant="ghost"
              size="xs"
              h={7}
              minW={7}
              p={1}
              borderRadius="3px"
            >
              <ExternalLink size={14} />
            </Button>
          )}
        </HStack>
      </HStack>
      <Box minW={0} p={3}>
        {view === "original" ? (
          <PlainStringValue value={value} />
        ) : view === "raw" && raw ? (
          <Suspense fallback={<Skeleton h="104px" w="full" />}>
            <RichCodeEditor
              value={raw}
              language={json !== undefined ? "json" : "xml"}
              theme="eth-rich-output"
              beforeMount={(monaco) =>
                monaco.editor.defineTheme("eth-rich-output", {
                  base: "vs-dark",
                  inherit: true,
                  rules: [],
                  colors: { "editor.background": editorBackground },
                })
              }
              options={{
                readOnly: true,
                domReadOnly: true,
                ariaLabel: json !== undefined ? "Raw JSON" : "Raw SVG",
                fontSize: 12,
                lineHeight: 20,
                padding: { top: 4, bottom: 4 },
                lineNumbers: "on",
                lineNumbersMinChars: 3,
                glyphMargin: false,
                folding: true,
                renderLineHighlight: "none",
                overviewRulerLanes: 0,
                hideCursorInOverviewRuler: true,
                scrollbar: {
                  verticalScrollbarSize: 6,
                  horizontalScrollbarSize: 6,
                },
              }}
            />
          </Suspense>
        ) : (
          preview
        )}
      </Box>
    </Box>
  );
}
