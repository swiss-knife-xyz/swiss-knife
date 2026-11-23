"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight, Pencil, RotateCcw, X } from "lucide-react";
import { Box, Button, HStack, Text, Textarea } from "@chakra-ui/react";
import type { Arg, DecodeRecursiveResult } from "@/types";
import {
  CalldataTree,
  type CalldataTreeEditor,
} from "@/components/decodedParams/CalldataTree";
import { renderInputFields } from "@/components/fnParams/Renderer";
import { CopyToClipboard } from "@/components/CopyToClipboard";
import { ExampleSnapshotContext } from "@/components/decodedParams/ExampleSnapshotContext";
import {
  CalldataEditError,
  createCalldataDraft,
  draftFunctionDefinitions,
  draftTree,
  emptyParameter,
  encodeDraft,
  updateDraft,
  type CalldataDraft,
  type ParameterDraft,
} from "@/lib/calldataEditor";

const noop = () => {};

type Props = {
  result: NonNullable<DecodeRecursiveResult>;
  calldata?: string;
  chainId?: number;
  functionName: string;
  isFunctionNameGuessed?: boolean;
  getDecodeHref: (calldata: string, definitions: string[]) => string;
  getTransactionHref?: (calldata: string) => string;
  onUseCalldata?: (calldata: string) => void;
  onDraftChange?: (
    source: NonNullable<DecodeRecursiveResult>,
    calldata: string | null | undefined
  ) => void;
  renderToolbar?: (
    editButton: React.ReactNode,
    isEditing: boolean
  ) => React.ReactNode;
};

/** The key is owned here so any new decode discards the previous editing session. */
export function EditableCalldata(props: Props) {
  const [session, setSession] = useState({
    result: props.result,
    editing: false,
    generation: 0,
  });
  if (session.result !== props.result) {
    setSession({
      result: props.result,
      editing: false,
      generation: session.generation + 1,
    });
  }
  const editing = session.result === props.result && session.editing;
  useEffect(() => {
    if (!editing) props.onDraftChange?.(props.result, undefined);
  }, [editing, props.result, props.onDraftChange]);
  const initial = useMemo(
    () =>
      props.calldata
        ? createCalldataDraft(props.result, props.calldata)
        : undefined,
    [props.result, props.calldata]
  );
  const editButton =
    initial && !editing ? (
      <Button
        size="sm"
        variant="outline"
        leftIcon={<Pencil size={16} aria-hidden="true" />}
        color="text.primary"
        onClick={() => setSession((prev) => ({ ...prev, editing: true }))}
      >
        Edit calldata
      </Button>
    ) : null;
  return (
    <Box
      minW={0}
      sx={{ containerType: "inline-size", containerName: "calldata-editor" }}
    >
      {props.renderToolbar
        ? props.renderToolbar(editButton, editing)
        : editButton && (
            <HStack justify="flex-end" mb={2}>
              {editButton}
            </HStack>
          )}
      {editing && initial ? (
        <DraftEditor
          key={session.generation}
          {...props}
          initial={initial}
          onCancel={() => setSession((prev) => ({ ...prev, editing: false }))}
          onReset={() =>
            setSession((prev) => ({ ...prev, generation: prev.generation + 1 }))
          }
        />
      ) : (
        <CalldataTree
          args={props.result.args}
          kind={props.result.kind}
          decodeNote={props.result.decodeNote}
          chainId={props.chainId}
          functionName={props.functionName}
          isFunctionNameGuessed={props.isFunctionNameGuessed}
        />
      )}
    </Box>
  );
}

function DraftEditor({
  initial,
  onCancel,
  onReset,
  getDecodeHref,
  getTransactionHref,
  onUseCalldata,
  chainId,
  functionName,
  result,
  onDraftChange,
}: Props & {
  initial: CalldataDraft;
  onCancel: () => void;
  onReset: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const treeRef = useRef<HTMLDivElement>(null);
  const [reveal, setReveal] = useState<CalldataTreeEditor["reveal"]>();
  useEffect(() => {
    if (!reveal) return;
    const frame = requestAnimationFrame(() => {
      const item = treeRef.current?.querySelector<HTMLElement>(
        `[data-calldata-path="${reveal.path}"]`
      );
      const reduced = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      item?.scrollIntoView?.({
        behavior: reduced ? "auto" : "smooth",
        block: "start",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [reveal]);
  const [output, setOutput] = useState<string>();
  const [invalidInputs, setInvalidInputs] = useState<Record<string, boolean>>(
    {}
  );
  const [error, setError] = useState<CalldataEditError | Error>();
  const tree = useMemo(() => draftTree(draft), [draft]);
  const change = (
    id: string,
    update: (param: ParameterDraft) => ParameterDraft
  ) => {
    setDraft((prev) => updateDraft(prev, id, update));
    setOutput(undefined);
    setError(undefined);
  };
  const hasInvalidInputs = [...tree.fields.values()].some(
    (param) => invalidInputs[param.id]
  );
  useEffect(() => {
    if (!onDraftChange) return;
    if (hasInvalidInputs) {
      onDraftChange(result, null);
      return;
    }
    try {
      onDraftChange(result, encodeDraft(draft));
    } catch {
      onDraftChange(result, null);
    }
  }, [draft, hasInvalidInputs, onDraftChange, result]);
  const reportValidation = (id: string, invalid: boolean) => {
    setInvalidInputs((previous) =>
      previous[id] === invalid ? previous : { ...previous, [id]: invalid }
    );
    if (invalid) setOutput(undefined);
  };
  const field = (param: ParameterDraft, path: string) => (
    <Box
      key={param.id}
      py={1}
      data-edit-field={param.id}
      sx={{ "& .fn-input-info": { display: "none" } }}
    >
      {renderInputFields({
        chainId: chainId ?? 1,
        input: JSON.parse(param.input.format("json")),
        value: param.value,
        ariaLabel: `${path} ${param.input.name || param.input.type}`,
        onChange: (event) =>
          change(param.id, (previous) => ({
            ...previous,
            value: event.target.value,
            dirty: true,
            // Replacing raw bytes invalidates their decoded draft immediately.
            ...(previous.call
              ? {
                  call: undefined,
                  rawMode: false,
                  note: "Raw bytes replaced. Decode the encoded result to inspect this payload.",
                }
              : {}),
          })),
        setFunctionIsDisabled: (invalid) => reportValidation(param.id, invalid),
        onValidationChange: (invalid) => reportValidation(param.id, invalid),
        onKeyDown: noop,
        isError:
          error instanceof CalldataEditError && error.parameterId === param.id,
        isInvalid:
          error instanceof CalldataEditError && error.parameterId === param.id,
        immediateUpdates: true,
      })}
      {error instanceof CalldataEditError && error.parameterId === param.id && (
        <Text role="alert" fontSize="xs" color="red.300" mt={1}>
          {error.message}
        </Text>
      )}
    </Box>
  );
  const actions = (_arg: Arg, path: string) => {
    const param = tree.fields.get(path)!;
    const parent = tree.parents.get(path);
    return (
      <HStack spacing={1} flexWrap="wrap">
        {param.children &&
          param.input.baseType === "array" &&
          param.input.arrayLength === -1 && (
            <Button
              size="xs"
              h={6}
              variant="ghost"
              aria-label={`Add item to ${path}`}
              onClick={() => {
                const item = emptyParameter(param.input.arrayChildren!);
                change(param.id, (p) => ({
                  ...p,
                  dirty: true,
                  children: [...p.children!, item],
                }));
                setReveal({
                  path: `${path}.${param.children!.length}`,
                  id: item.id,
                });
              }}
            >
              + Add item
            </Button>
          )}
        {param.call && (
          <Button
            size="xs"
            h={6}
            variant="ghost"
            aria-label={`Toggle raw bytes for ${path}`}
            isDisabled={hasInvalidInputs && !param.rawMode}
            onClick={() => {
              try {
                const bytes = param.rawMode
                  ? param.value
                  : encodeDraft(param.call!);
                change(param.id, (p) => ({
                  ...p,
                  rawMode: !p.rawMode,
                  value: bytes,
                }));
              } catch (e) {
                setError(e instanceof Error ? e : new Error(String(e)));
              }
            }}
          >
            {param.rawMode ? "Decoded fields" : "Edit raw bytes"}
          </Button>
        )}
        {parent?.input.baseType === "array" &&
          parent.input.arrayLength === -1 && (
            <Button
              size="xs"
              h={6}
              variant="ghost"
              aria-label={`Remove ${path}`}
              onClick={() =>
                change(parent.id, (p) => ({
                  ...p,
                  dirty: true,
                  children: p.children!.filter(
                    (child) => child.id !== param.id
                  ),
                }))
              }
            >
              Remove
            </Button>
          )}
      </HStack>
    );
  };
  const editor: CalldataTreeEditor = {
    reveal,
    value: (_arg, path) => field(tree.fields.get(path)!, path),
    actions,
    raw: (_arg, path) => {
      const param = tree.fields.get(path)!;
      return param.rawMode ? <Box pl={5}>{field(param, path)}</Box> : null;
    },
    hideChildren: (path) => !!tree.fields.get(path)?.rawMode,
  };
  const encode = () => {
    setOutput(undefined);
    setError(undefined);
    if (hasInvalidInputs) return;
    try {
      setOutput(encodeDraft(draft));
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    }
  };
  return (
    // Snapshot enrichment belongs to the original transaction, never to draft values.
    <ExampleSnapshotContext.Provider value={null}>
      <Box
        display="grid"
        gridTemplateColumns="1fr"
        sx={{
          "@container calldata-editor (min-width: 720px)": {
            gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
            "& > :first-child": { justifySelf: "start" },
            "& > :last-child": { justifySelf: "end" },
          },
        }}
        alignItems="center"
        mb={3}
        px={3}
        py={2}
        gap={2}
        border="1px solid"
        borderColor="yellow.800"
        bg="rgba(236, 201, 75, 0.06)"
        borderRadius="md"
      >
        <Text
          fontSize="sm"
          fontWeight="medium"
          color="yellow.300"
          justifySelf="center"
        >
          Editing draft
        </Text>
        <Button
          size="sm"
          colorScheme="blue"
          variant="primary"
          onClick={encode}
          isDisabled={hasInvalidInputs}
          justifySelf="center"
        >
          Encode new calldata
        </Button>
        <HStack spacing={1} justifySelf="center" whiteSpace="nowrap">
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<RotateCcw size={14} aria-hidden="true" />}
            onClick={onReset}
          >
            Reset changes
          </Button>
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<X size={14} aria-hidden="true" />}
            onClick={onCancel}
          >
            Cancel editing
          </Button>
        </HStack>
      </Box>
      {error && (
        <Text role="alert" color="red.300" fontSize="sm" mb={3}>
          {error.message}
        </Text>
      )}
      {output && (
        <Box mb={4}>
          <HStack justify="space-between" flexWrap="wrap" mb={2}>
            <Text fontSize="sm" fontWeight="semibold">
              Encoded calldata
            </Text>
            <HStack>
              <CopyToClipboard textToCopy={output} labelText="Copy calldata" />
              <Button
                size="sm"
                variant="outline"
                color="text.primary"
                as="a"
                href={getDecodeHref(output, draftFunctionDefinitions(draft))}
                target="_blank"
                rel="noopener noreferrer"
                rightIcon={<ArrowUpRight size={16} aria-hidden="true" />}
              >
                Decode result
              </Button>
            </HStack>
          </HStack>
          <Textarea
            aria-label="Encoded calldata"
            value={output}
            isReadOnly
            fontFamily="mono"
            fontSize="xs"
            rows={5}
          />
          <Text role="status" fontSize="xs" color="text.secondary" mt={1}>
            {output.toLowerCase() === initial.original.toLowerCase()
              ? "Matches original calldata."
              : "Includes your draft changes."}
          </Text>
          {onUseCalldata && (
            <HStack justify="center" mt={3}>
              <Button
                size="sm"
                variant="primary"
                colorScheme="blue"
                rightIcon={<ArrowDown size={16} aria-hidden="true" />}
                onClick={() => onUseCalldata(output)}
              >
                Use new calldata
              </Button>
            </HStack>
          )}
          {getTransactionHref && (
            <HStack justify="center" mt={3}>
              <Button
                as="a"
                href={getTransactionHref(output)}
                target="_blank"
                rel="noopener noreferrer"
                size="sm"
                variant="outline"
                color="text.primary"
                rightIcon={<ArrowUpRight size={16} aria-hidden="true" />}
              >
                Send Transaction
              </Button>
            </HStack>
          )}
        </Box>
      )}
      {[...tree.fields.values()].some(
        (param) => param.call?.kind === "safe-multisend"
      ) && (
        <Text fontSize="xs" color="text.secondary" mb={2}>
          MultiSend operation: 0 = CALL, 1 = DELEGATECALL.
        </Text>
      )}
      <Box ref={treeRef}>
        <CalldataTree
          args={tree.args}
          chainId={chainId}
          functionName={functionName}
          editor={editor}
        />
      </Box>
    </ExampleSnapshotContext.Provider>
  );
}
