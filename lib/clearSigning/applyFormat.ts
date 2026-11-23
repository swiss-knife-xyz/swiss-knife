import { resolvePath, type PathValue } from "./resolvePath";
import type { Erc7730Descriptor, Erc7730Field, Erc7730Format } from "./types";
import { chainIdToChain } from "@/data/networks";
import { decodeContentHashForDisplay } from "./contentHashFormat";

/**
 * Apply a descriptor `display.formats[…]` to a normalized data root (calldata
 * args object or EIP-712 message object), producing a tree of "rendered fields"
 * ready for the React layer to display.
 *
 * Pure module — no React, no network. The renderer turns each `RenderedValue`
 * into the right Chakra primitive (AddressInline, token-amount badge, etc.).
 */

export interface RenderedField {
  label: string;
  /** When the path iterates ([]), one rendered value per element. */
  values: RenderedValue[];
  visible: boolean;
  /** Nested fields produced via `details.[]` style iteration. */
  groups?: Array<RenderedField[]>;
}

export interface TokenMetadataHint {
  symbol: string;
  decimals: number;
  logoUrl?: string;
}

export type RenderedValue =
  | { kind: "raw"; text: string }
  | { kind: "address"; address: string }
  | {
      kind: "tokenAmount";
      amountRaw: string;
      tokenAddress?: string;
      native?: boolean;
      chainId?: number;
      thresholdRaw?: string;
      thresholdMessage?: string;
      /** Order limits are amounts, never unlimited allowance sentinels. */
      allowUnlimited?: boolean;
      tokenMetadata?: TokenMetadataHint;
    }
  | { kind: "amount"; amountRaw: string; chainId?: number; decimals?: number }
  | { kind: "date"; timestamp: number }
  | { kind: "duration"; seconds: number }
  | {
      kind: "unit";
      raw: string;
      decimals: number;
      base?: string;
      prefix: boolean;
      text: string;
    }
  | { kind: "enum"; text: string }
  | { kind: "chainId"; chainId: number; text?: string }
  | {
      kind: "tokenTicker";
      tokenAddress: string;
      chainId?: number;
      tokenMetadata?: TokenMetadataHint;
    }
  | { kind: "gweiName"; tokenId: string; chainId?: number }
  | {
      kind: "contentHash";
      raw: string;
      uri?: string;
      codec?: string;
      decoded?: string;
    }
  | {
      kind: "calldata";
      callee: string;
      data: string;
      amount?: string;
      from?: string;
      chainId?: number;
    }
  | { kind: "missing" };

export interface RenderInput {
  /** Normalized decoded args (for calldata) or EIP-712 message (for sig). */
  data: unknown;
  /** Chain context — used by tokenAmount / amount formatters. */
  chainId: number;
  /** Runtime native-currency metadata, including custom-chain overrides. */
  nativeCurrency?: {
    symbol?: string;
    decimals?: number;
  };
  /**
   * Complete runtime ERC-20 metadata keyed by chain and token address.
   * Clear-signing intent interpolation uses the same metadata as amount rows
   * so a heading cannot expose raw base units while the row shows token units.
   */
  tokenMetadata?: Record<string, TokenMetadataHint>;
  /**
   * ERC-7730 envelope context referenced with `@` paths. For calldata this is
   * the containing transaction/call; for EIP-712 this is the signing envelope
   * with `to` set to the verifying contract.
   */
  envelope?: Record<string, unknown>;
}

interface RenderContext {
  descriptor?: Erc7730Descriptor;
}

export function applyFormat(
  format: Erc7730Format,
  input: RenderInput,
  descriptor?: Erc7730Descriptor
): RenderedField[] {
  if (!formatRuntimeGuardsPass(format, input, descriptor)) return [];
  const fields = (format.fields || []).filter(
    (field) =>
      !field.path ||
      !format.excluded?.some((path) => pathsEquivalent(path, field.path!))
  );
  const context: RenderContext = { descriptor };
  return fields
    .map((f) => renderField(f, input, context))
    .filter((f): f is RenderedField => f !== null);
}

export function formatRuntimeGuardsPass(
  format: Erc7730Format,
  input: RenderInput,
  descriptor?: Erc7730Descriptor
): boolean {
  for (const path of format.required || []) {
    if (!isPresent(resolveInputPath(input, path))) return false;
  }

  const fields = format.fields || [];
  const context: RenderContext = { descriptor };
  return fieldVisibilityRulesPass(
    fields,
    input,
    context,
    format.excluded || []
  );
}

export function resolveIntentText(
  format: Erc7730Format,
  input: RenderInput,
  descriptor?: Erc7730Descriptor
): string {
  const interpolated = interpolateIntent(format, input, descriptor);
  if (interpolated) return interpolated;

  if (typeof format.intent === "string") return format.intent;
  if (isRecord(format.intent)) {
    return Object.entries(format.intent)
      .map(([label, value]) => `${label}: ${value}`)
      .join(" · ");
  }
  return format.$id || "";
}

function renderField(
  rawField: Erc7730Field,
  input: RenderInput,
  context: RenderContext
): RenderedField | null {
  const field = resolveFieldReference(rawField, context);

  // Hidden by descriptor → drop entirely.
  if (!shouldDisplayField(field, input)) return null;

  // Embedded calldata (ERC-7730 `calldata` format): the value at `field.path` is
  // bytes that themselves encode a call to another contract. Needs zipped
  // iteration with `params.calleePath` (callee per inner call) and optionally
  // `params.amountPath` / `params.selectorPath` — the generic array branch below
  // would only iterate one side, so handle it first.
  if ((field.format || "").toLowerCase() === "calldata") {
    return renderCalldataField(field, input, context);
  }

  // Nested fields: iterate elements at `field.path` and apply child fields per element.
  if (field.fields && field.fields.length > 0) {
    const resolved = field.path
      ? resolveInputPath(input, field.path)
      : input.data;
    if (!isPresent(resolved)) return null;
    const elements = Array.isArray(resolved) ? resolved : [resolved];
    const groups: Array<RenderedField[]> = elements.map((element) => {
      const childInput: RenderInput = {
        data: element,
        chainId: input.chainId,
        nativeCurrency: input.nativeCurrency,
        tokenMetadata: input.tokenMetadata,
        envelope: input.envelope,
      };
      return (field.fields || [])
        .map((sub) => renderField(sub, childInput, context))
        .filter((r): r is RenderedField => r !== null);
    });
    return {
      label: field.label || "",
      values: [],
      groups,
      visible: true,
    };
  }

  const raw = resolveFieldValue(field, input);
  if (raw === undefined) {
    return null;
  }

  // Iteration over an array (e.g. path ends in `[]`) — render one value per item.
  if (Array.isArray(raw)) {
    const values: RenderedValue[] = [];
    for (const item of raw) {
      values.push(toRenderedValue(field, item, input, context, values.length));
    }
    return {
      label: field.label || "",
      values,
      visible: true,
    };
  }

  return {
    label: field.label || "",
    values: [toRenderedValue(field, raw, input, context)],
    visible: true,
  };
}

/**
 * Render a `calldata`-format field. The path resolves to either a single hex
 * bytes value OR an array of hex bytes (when the path contains `[]`, e.g. Safe
 * BatchExecutor's `calls.[].data`). The callee/amount/selector params can each
 * be supplied as literals or as paths; when supplied as paths and the data side
 * iterates, the callee/amount/selector sides MUST iterate in lockstep — we zip
 * by index and drop the field if no callee can be paired with a data element.
 */
function renderCalldataField(
  field: Erc7730Field,
  input: RenderInput,
  context: RenderContext
): RenderedField | null {
  const params = resolveParams(field, input, context);

  const dataAt = resolveFieldValue(field, input);
  if (dataAt === undefined) return null;

  const calleeLit =
    typeof params.callee === "string" ? params.callee : undefined;
  const calleeAt =
    typeof params.calleePath === "string"
      ? resolveInputPath(input, params.calleePath)
      : undefined;
  const amountLit =
    params.amount === undefined
      ? undefined
      : typeof params.amount === "bigint"
        ? (params.amount as bigint).toString()
        : String(params.amount);
  const amountAt =
    typeof params.amountPath === "string"
      ? resolveInputPath(input, params.amountPath)
      : undefined;
  const spenderLit =
    typeof params.spender === "string" ? params.spender : undefined;
  const spenderAt =
    typeof params.spenderPath === "string"
      ? resolveInputPath(input, params.spenderPath)
      : undefined;
  // selector / selectorPath cover the case where the embedded bytes lack
  // their own 4-byte function selector (the caller supplies it separately).
  // We prepend it to `data` in `buildCalldataValue` so the nested
  // ClearSigningView's signature match has something to compute against.
  const selectorLit =
    typeof params.selector === "string" ? params.selector : undefined;
  const selectorAt =
    typeof params.selectorPath === "string"
      ? resolveInputPath(input, params.selectorPath)
      : undefined;
  const chainIdLit = resolveChainIdValue(params.chainId);
  const chainIdAt =
    typeof params.chainIdPath === "string"
      ? resolveInputPath(input, params.chainIdPath)
      : undefined;

  const dataIsArray = Array.isArray(dataAt);
  const calleeIsArray = Array.isArray(calleeAt);
  const amountIsArray = Array.isArray(amountAt);
  const spenderIsArray = Array.isArray(spenderAt);
  const selectorIsArray = Array.isArray(selectorAt);
  const chainIdIsArray = Array.isArray(chainIdAt);

  if (
    !dataIsArray &&
    !calleeIsArray &&
    !amountIsArray &&
    !spenderIsArray &&
    !selectorIsArray &&
    !chainIdIsArray
  ) {
    const value = buildCalldataValue(
      dataAt,
      calleeAt ?? calleeLit,
      amountAt ?? amountLit,
      spenderAt ?? spenderLit,
      selectorAt ?? selectorLit,
      chainIdAt ?? chainIdLit
    );
    if (!value) return null;
    return { label: field.label || "", values: [value], visible: true };
  }

  // Zipped iteration. Use the data array's length as the source of truth;
  // pair each index with calleeAt[i] / amountAt[i] / selectorAt[i] when those
  // are arrays, or with the literal / single resolved value when they aren't.
  const dataArr = dataIsArray ? (dataAt as unknown[]) : [dataAt];
  const values: RenderedValue[] = [];
  for (let i = 0; i < dataArr.length; i++) {
    const data = dataArr[i];
    const callee = calleeIsArray
      ? (calleeAt as unknown[])[i]
      : (calleeAt ?? calleeLit);
    const amount = amountIsArray
      ? (amountAt as unknown[])[i]
      : (amountAt ?? amountLit);
    const spender = spenderIsArray
      ? (spenderAt as unknown[])[i]
      : (spenderAt ?? spenderLit);
    const selector = selectorIsArray
      ? (selectorAt as unknown[])[i]
      : (selectorAt ?? selectorLit);
    const innerChainId = chainIdIsArray
      ? (chainIdAt as unknown[])[i]
      : (chainIdAt ?? chainIdLit);
    const v = buildCalldataValue(
      data,
      callee,
      amount,
      spender,
      selector,
      innerChainId
    );
    if (v) values.push(v);
  }
  if (values.length === 0) return null;
  return { label: field.label || "", values, visible: true };
}

function buildCalldataValue(
  data: unknown,
  callee: unknown,
  amount: unknown,
  spender: unknown,
  selector: unknown,
  chainId: unknown
): RenderedValue | null {
  if (typeof data !== "string") return null;
  if (typeof callee !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(callee)) {
    return null;
  }
  const dataHex = data.startsWith("0x") ? data : `0x${data}`;
  // When the descriptor supplies a separate selector, the spec says the
  // embedded bytes don't include it — prepend so the nested view can match
  // against `data[0..10]`. Accept both `0x12345678` and `12345678` forms;
  // reject anything that isn't exactly 4 bytes (would silently corrupt the
  // calldata if we didn't validate).
  let finalData = dataHex;
  if (typeof selector === "string" && selector.length > 0) {
    const sel = selector.startsWith("0x") ? selector.slice(2) : selector;
    if (/^[0-9a-fA-F]{8}$/.test(sel)) {
      finalData = `0x${sel.toLowerCase()}${dataHex.slice(2)}`;
    }
  }
  const amountStr =
    amount === undefined || amount === null
      ? undefined
      : typeof amount === "bigint"
        ? amount.toString()
        : typeof amount === "number"
          ? String(amount)
          : typeof amount === "string"
            ? amount
            : undefined;
  return {
    kind: "calldata",
    callee,
    data: finalData,
    amount: amountStr,
    from:
      typeof spender === "string" && /^0x[a-fA-F0-9]{40}$/.test(spender)
        ? spender
        : undefined,
    chainId: resolveChainIdValue(chainId) ?? undefined,
  };
}

function toRenderedValue(
  field: Erc7730Field,
  raw: PathValue,
  input: RenderInput,
  context: RenderContext,
  itemIndex?: number
): RenderedValue {
  const format = (field.format || "raw").toLowerCase();
  const params = resolveParams(field, input, context);

  if (raw === undefined || raw === null) return { kind: "missing" };

  switch (format) {
    case "addressname":
    case "addressName".toLowerCase(): {
      const text = String(raw);
      const address = resolveSenderAddressAlias(text, params, input);
      return /^0x[0-9a-fA-F]{40}$/.test(text)
        ? { kind: "address", address }
        : { kind: "raw", text };
    }
    case "interoperableaddressname":
    case "interoperableAddressName".toLowerCase(): {
      const parsed = parseInteroperableAddress(String(raw));
      if (parsed?.address) return { kind: "address", address: parsed.address };
      return { kind: "raw", text: stringifyValue(raw) };
    }
    case "tokenamount":
    case "tokenAmount".toLowerCase(): {
      const amountRaw = stringifyAmount(raw);
      // Token address resolution order:
      //   1. params.token / params.tokenAddress — literal 0x address baked into
      //      the descriptor (tokenAddress is our older built-in alias; token is
      //      the ERC-7730 schema name)
      //   2. params.tokenPath — resolve from somewhere in the decoded args
      //      or from the `@` envelope context
      // No source → render the raw amount instead of guessing native currency.
      const literalParam =
        typeof params.token === "string"
          ? params.token
          : typeof params.tokenAddress === "string"
            ? params.tokenAddress
            : undefined;
      const literal =
        literalParam && /^0x[a-fA-F0-9]{40}$/.test(literalParam)
          ? literalParam
          : undefined;
      const localTokenAddr =
        literal ||
        (typeof params.tokenPath === "string"
          ? asIndexedString(
              resolveInputPath(input, params.tokenPath),
              itemIndex
            )
          : undefined);
      const native = localTokenAddr
        ? isNativeCurrencyToken(localTokenAddr, params)
        : false;
      const tokenChainId = resolveChainIdParam(params, input, itemIndex);
      const thresholdRaw =
        params.threshold === undefined || params.threshold === null
          ? undefined
          : stringifyAmount(params.threshold);
      const thresholdMessage =
        typeof params.message === "string"
          ? params.message
          : thresholdRaw !== undefined
            ? "Unlimited"
            : undefined;
      return {
        kind: "tokenAmount",
        amountRaw,
        tokenAddress: native ? undefined : localTokenAddr,
        native,
        chainId: tokenChainId,
        thresholdRaw,
        thresholdMessage,
        allowUnlimited: params.allowUnlimited !== false,
        tokenMetadata: descriptorTokenMetadata(
          context.descriptor,
          localTokenAddr,
          tokenChainId,
          input
        ),
      };
    }
    case "amount": {
      return {
        kind: "amount",
        amountRaw: stringifyAmount(raw),
        chainId: input.chainId,
        decimals:
          normalizeDecimals(input.nativeCurrency?.decimals) ?? undefined,
      };
    }
    case "date": {
      const encoding = String(params.encoding || "timestamp");
      const n = Number(raw);
      if (!Number.isFinite(n)) return { kind: "raw", text: String(raw) };
      // We treat blockheight encodings as raw for now (chain-specific lookup not wired).
      if (encoding !== "timestamp") return { kind: "raw", text: String(raw) };
      return { kind: "date", timestamp: n };
    }
    case "duration": {
      const n = Number(raw);
      return Number.isFinite(n)
        ? { kind: "duration", seconds: Math.max(0, Math.floor(n)) }
        : { kind: "raw", text: stringifyValue(raw) };
    }
    case "unit": {
      const decimals = Number(params.decimals ?? 0);
      const base = typeof params.base === "string" ? params.base : undefined;
      const prefix = params.prefix === true;
      return {
        kind: "unit",
        raw: stringifyAmount(raw),
        decimals: Number.isFinite(decimals) ? decimals : 0,
        base,
        prefix,
        text: formatUnitDisplay(
          stringifyAmount(raw),
          Number.isFinite(decimals) ? decimals : 0,
          base,
          prefix
        ),
      };
    }
    case "enum": {
      const enumMap = resolveEnumMap(params);
      const text = enumMap?.[stringifyAmount(raw)] ?? enumMap?.[String(raw)];
      return { kind: "enum", text: text || stringifyValue(raw) };
    }
    case "chainid":
    case "chainId".toLowerCase(): {
      const chainId = resolveChainIdValue(raw);
      return chainId === null
        ? { kind: "raw", text: stringifyValue(raw) }
        : { kind: "chainId", chainId };
    }
    case "tokenticker":
    case "tokenTicker".toLowerCase(): {
      const tokenAddress = normalizeAddress(String(raw));
      if (!tokenAddress) return { kind: "raw", text: stringifyValue(raw) };
      const tokenChainId = resolveChainIdParam(params, input, itemIndex);
      return {
        kind: "tokenTicker",
        tokenAddress,
        chainId: tokenChainId,
        tokenMetadata: descriptorTokenMetadata(
          context.descriptor,
          tokenAddress,
          tokenChainId,
          input
        ),
      };
    }
    case "gweiname":
    case "gweiName".toLowerCase():
      return {
        kind: "gweiName",
        tokenId: stringifyAmount(raw),
        chainId: resolveChainIdParam(params, input, itemIndex),
      };
    case "contenthash": {
      return {
        kind: "contentHash",
        ...decodeContentHashForDisplay(raw),
      };
    }
    case "nftname":
    case "nftName".toLowerCase(): {
      const collection =
        typeof params.collection === "string"
          ? params.collection
          : typeof params.collectionPath === "string"
            ? asIndexedString(
                resolveInputPath(input, params.collectionPath),
                itemIndex
              )
            : undefined;
      const tokenId = stringifyAmount(raw);
      const collectionText =
        collection && normalizeAddress(collection)
          ? `${shortAddress(collection)} #${tokenId}`
          : `NFT #${tokenId}`;
      return { kind: "raw", text: collectionText };
    }
    case "raw":
    default: {
      const text = stringifyValue(raw);
      // If the value happens to be a 0x-address, render it as an address for UX.
      if (typeof raw === "string" && /^0x[0-9a-fA-F]{40}$/.test(raw)) {
        return { kind: "address", address: raw };
      }
      return { kind: "raw", text };
    }
  }
}

function resolveFieldValue(field: Erc7730Field, input: RenderInput): PathValue {
  if (field.value !== undefined) return field.value;
  if (field.path) return resolveInputPath(input, field.path);
  return undefined;
}

function shouldDisplayField(field: Erc7730Field, input: RenderInput): boolean {
  const visible = field.visible;
  if (visible === "never") return false;
  if (isRecord(visible)) {
    // `mustMatch` is a validation-only descriptor assertion. The field itself
    // should not be rendered when the assertion passes.
    if (Array.isArray(visible.mustMatch)) return false;
    if (Array.isArray(visible.ifNotIn)) {
      const raw = resolveFieldValue(field, input);
      return !visible.ifNotIn.some((expected) =>
        valuesEquivalent(expected, raw)
      );
    }
  }
  return true;
}

function fieldVisibilityRulesPass(
  fields: Erc7730Field[],
  input: RenderInput,
  context: RenderContext,
  excludedPaths: string[] = []
): boolean {
  for (const rawField of fields) {
    const field = resolveFieldReference(rawField, context);
    if (
      field.path &&
      excludedPaths.some((path) => pathsEquivalent(path, field.path!))
    ) {
      continue;
    }

    const resolvedParams = resolveRuntimeReferences(
      field.params || {},
      input,
      context.descriptor
    );
    if (hasInvalidRuntimeReference(resolvedParams)) return false;
    if (field.value !== undefined) {
      const resolvedValue = resolveRuntimeReferences(
        field.value,
        input,
        context.descriptor
      );
      if (hasInvalidRuntimeReference(resolvedValue)) return false;
    }

    const visible = field.visible;
    if (isRecord(visible) && Array.isArray(visible.mustMatch)) {
      const raw = resolveFieldValue(field, input);
      if (
        !isPresent(raw) ||
        !visible.mustMatch.some((expected) => valuesEquivalent(expected, raw))
      ) {
        return false;
      }
    }

    if (fieldIsRequiredForDisplay(field)) {
      const raw = resolveFieldValue(field, input);
      if (!isPresent(raw)) return false;
      if (Array.isArray(raw) && !arrayParamLengthsPass(raw, field, input)) {
        return false;
      }
    }

    if (field.fields?.length) {
      const resolved = field.path
        ? resolveInputPath(input, field.path)
        : input.data;
      const elements = Array.isArray(resolved) ? resolved : [resolved];
      for (const element of elements) {
        if (!isPresent(element)) continue;
        const childInput: RenderInput = {
          data: element,
          chainId: input.chainId,
          envelope: input.envelope,
        };
        if (
          !fieldVisibilityRulesPass(
            field.fields,
            childInput,
            context,
            excludedPaths
          )
        ) {
          return false;
        }
      }
    }
  }
  return true;
}

function fieldIsRequiredForDisplay(field: Erc7730Field): boolean {
  const visible = field.visible;
  if (visible === "never" || visible === "optional") return false;
  if (isRecord(visible) && Array.isArray(visible.mustMatch)) return false;
  return true;
}

function arrayParamLengthsPass(
  raw: unknown[],
  field: Erc7730Field,
  input: RenderInput
): boolean {
  const params = (field.params || {}) as Record<string, unknown>;
  const pathParamNames = [
    "tokenPath",
    "chainIdPath",
    "calleePath",
    "amountPath",
    "spenderPath",
    "selectorPath",
    "collectionPath",
  ];
  return pathParamNames.every((name) => {
    const path = params[name];
    if (typeof path !== "string") return true;
    const resolved = resolveInputPath(input, path);
    return !Array.isArray(resolved) || resolved.length === raw.length;
  });
}

function resolveParams(
  field: Erc7730Field,
  input: RenderInput,
  context: RenderContext
): Record<string, unknown> {
  return resolveRuntimeReferences(
    field.params || {},
    input,
    context.descriptor
  ) as Record<string, unknown>;
}

function interpolateIntent(
  format: Erc7730Format,
  input: RenderInput,
  descriptor?: Erc7730Descriptor
): string | null {
  if (!format.interpolatedIntent) return null;

  const open = "\u0000OPEN_BRACE\u0000";
  const close = "\u0000CLOSE_BRACE\u0000";
  const context: RenderContext = { descriptor };
  let failed = false;
  const text = format.interpolatedIntent
    .replace(/\{\{/g, open)
    .replace(/\}\}/g, close)
    .replace(/\{([^{}]+)\}/g, (_match, rawPath: string) => {
      const path = rawPath.trim();
      const fieldMatch = findFieldForIntentPath(
        format.fields || [],
        path,
        context
      );
      const field = fieldMatch?.field || { path, format: "raw" };
      const nestedData = fieldMatch?.parentPath
        ? resolveInputPath(input, fieldMatch.parentPath)
        : undefined;
      const fieldInput =
        nestedData === undefined
          ? input
          : {
              ...input,
              data: nestedData,
            };
      const resolved =
        field.value !== undefined
          ? field.value
          : path.startsWith("$.")
            ? resolveDescriptorPath(descriptor, path)
            : resolveInputPath(input, path);
      if (resolved === undefined) {
        failed = true;
        return "";
      }
      const values = Array.isArray(resolved) ? resolved : [resolved];
      const rendered = values.map((value, index) =>
        renderedValueToIntentText(
          toRenderedValue(field, value, fieldInput, context, index),
          input.chainId
        )
      );
      return rendered.join(", ");
    })
    .replace(new RegExp(open, "g"), "{")
    .replace(new RegExp(close, "g"), "}");

  return failed ? null : text.trim();
}

function findFieldForIntentPath(
  fields: Erc7730Field[],
  requestedPath: string,
  context: RenderContext,
  parentPath?: string
): { field: Erc7730Field; parentPath?: string } | null {
  for (const rawField of fields) {
    const field = resolveFieldReference(rawField, context);
    const fullPath = field.path
      ? joinFieldPath(parentPath, field.path)
      : parentPath;
    if (field.path && pathsEquivalent(fullPath || field.path, requestedPath)) {
      return { field, parentPath };
    }
    if (field.fields?.length) {
      const child = findFieldForIntentPath(
        field.fields,
        requestedPath,
        context,
        fullPath
      );
      if (child) return child;
    }
  }
  return null;
}

function joinFieldPath(
  parentPath: string | undefined,
  childPath: string
): string {
  if (!parentPath || childPath.startsWith("@") || childPath.startsWith("#")) {
    return childPath;
  }
  return `${parentPath}.${childPath}`;
}

function pathsEquivalent(a: string, b: string): boolean {
  return normalizeFieldPath(a) === normalizeFieldPath(b);
}

function normalizeFieldPath(path: string): string {
  if (path.startsWith("#.")) return path.slice(2);
  if (path.startsWith("#")) return path.slice(1);
  return path;
}

function renderedValueToIntentText(
  value: RenderedValue,
  fallbackChainId: number
): string {
  switch (value.kind) {
    case "address":
      return shortAddress(value.address);
    case "tokenAmount":
      return value.tokenMetadata
        ? `${formatDecimalRaw(value.amountRaw, value.tokenMetadata.decimals)} ${
            value.tokenMetadata.symbol
          }`
        : value.amountRaw;
    case "amount":
      return formatDecimalRaw(
        value.amountRaw,
        value.decimals ??
          nativeDecimalsForChain(value.chainId ?? fallbackChainId)
      );
    case "date":
      return new Date(value.timestamp * 1000).toLocaleString();
    case "duration":
      return formatDuration(value.seconds);
    case "unit":
      return value.text;
    case "enum":
      return value.text;
    case "chainId":
      return value.text || String(value.chainId);
    case "tokenTicker":
      return value.tokenMetadata?.symbol || shortAddress(value.tokenAddress);
    case "gweiName":
      return value.tokenId;
    case "contentHash":
      return value.uri || value.raw;
    case "raw":
      return value.text;
    case "calldata":
      return `${shortAddress(value.callee)} ${value.data.slice(0, 10)}`;
    case "missing":
      return "";
    default:
      return String(fallbackChainId);
  }
}

export function resolveInputPath(input: RenderInput, path: string): PathValue {
  if (path === "@") return input.envelope;
  if (path.startsWith("@.")) {
    return resolvePath(input.envelope, path.slice(2));
  }
  if (path.startsWith("@#")) {
    return resolvePath(input.envelope, path.slice(1));
  }
  return resolvePath(input.data, path);
}

function resolveFieldReference(
  field: Erc7730Field,
  context: RenderContext,
  seen = new Set<string>()
): Erc7730Field {
  if (!field.$ref) return resolveFieldParamReferences(field, context);

  const ref = field.$ref;
  if (seen.has(ref))
    return resolveFieldParamReferences(stripRef(field), context);
  seen.add(ref);

  const referenced = resolveDescriptorPath(context.descriptor, ref);
  if (!isRecord(referenced)) {
    return resolveFieldParamReferences(stripRef(field), context);
  }

  const base = resolveFieldReference(referenced as Erc7730Field, context, seen);
  return resolveFieldParamReferences(
    mergeReferencedField(base, field),
    context
  );
}

function mergeReferencedField(
  base: Erc7730Field,
  override: Erc7730Field
): Erc7730Field {
  const baseRest = { ...base };
  const baseParams = baseRest.params;
  const baseFields = baseRest.fields;
  delete baseRest.$ref;
  delete baseRest.params;
  delete baseRest.fields;

  const overrideRest = { ...override };
  const overrideParams = overrideRest.params;
  const overrideFields = overrideRest.fields;
  delete overrideRest.$ref;
  delete overrideRest.params;
  delete overrideRest.fields;

  const merged: Erc7730Field = {
    ...baseRest,
    ...overrideRest,
  };

  if (baseParams || overrideParams) {
    merged.params = {
      ...(baseParams || {}),
      ...(overrideParams || {}),
    };
  }

  const fields = overrideFields ?? baseFields;
  if (fields) merged.fields = fields;

  return merged;
}

function stripRef(field: Erc7730Field): Erc7730Field {
  const copy = { ...field };
  delete copy.$ref;
  return copy;
}

function resolveFieldParamReferences(
  field: Erc7730Field,
  context: RenderContext
): Erc7730Field {
  const next = { ...field };
  if (next.params) {
    next.params = resolveDescriptorReferences(
      next.params,
      context.descriptor
    ) as Record<string, unknown>;
  }
  if (next.value !== undefined) {
    next.value = resolveDescriptorReferences(
      next.value,
      context.descriptor
    ) as Erc7730Field["value"];
  }
  return next;
}

function resolveDescriptorReferences(
  value: unknown,
  descriptor: Erc7730Descriptor | undefined
): unknown {
  if (typeof value === "string" && value.startsWith("$.")) {
    const resolved = resolveDescriptorPath(descriptor, value);
    return resolved === undefined
      ? value
      : resolveDescriptorReferences(resolved, descriptor);
  }
  if (Array.isArray(value)) {
    return value.map((item) => resolveDescriptorReferences(item, descriptor));
  }
  if (isRecord(value)) {
    if (typeof value.map === "string" && typeof value.keyPath === "string") {
      return value;
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        resolveDescriptorReferences(item, descriptor),
      ])
    );
  }
  return value;
}

function resolveRuntimeReferences(
  value: unknown,
  input: RenderInput,
  descriptor: Erc7730Descriptor | undefined
): unknown {
  if (isMapReference(value)) {
    const mapNode = resolveRuntimeReferences(value.map, input, descriptor);
    const values = getMapValues(mapNode);
    if (!values) return INVALID_RUNTIME_REFERENCE;
    const key = resolveInputPath(input, value.keyPath);
    for (const candidate of mapKeysForValue(key)) {
      if (Object.prototype.hasOwnProperty.call(values, candidate)) {
        return resolveRuntimeReferences(values[candidate], input, descriptor);
      }
    }
    return INVALID_RUNTIME_REFERENCE;
  }

  if (typeof value === "string" && value.startsWith("$.")) {
    const resolved = resolveDescriptorPath(descriptor, value);
    return resolved === undefined
      ? value
      : resolveRuntimeReferences(resolved, input, descriptor);
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      resolveRuntimeReferences(item, input, descriptor)
    );
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        resolveRuntimeReferences(item, input, descriptor),
      ])
    );
  }

  return value;
}

const INVALID_RUNTIME_REFERENCE = Symbol("invalidRuntimeReference");

function hasInvalidRuntimeReference(value: unknown): boolean {
  if (value === INVALID_RUNTIME_REFERENCE) return true;
  if (Array.isArray(value)) return value.some(hasInvalidRuntimeReference);
  if (isRecord(value)) {
    return Object.values(value).some(hasInvalidRuntimeReference);
  }
  return false;
}

function isMapReference(
  value: unknown
): value is { map: unknown; keyPath: string } {
  return isRecord(value) && "map" in value && typeof value.keyPath === "string";
}

function getMapValues(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  if (isRecord(value.values)) return value.values;
  return value;
}

function mapKeysForValue(value: unknown): string[] {
  const raw =
    typeof value === "bigint" ||
    typeof value === "number" ||
    typeof value === "boolean"
      ? String(value)
      : typeof value === "string"
        ? value
        : stringifyValue(value);
  const keys = new Set<string>([raw]);
  if (/^0x[0-9a-fA-F]+$/.test(raw)) {
    keys.add(raw.toLowerCase());
    try {
      keys.add(BigInt(raw).toString());
    } catch {
      // keep the string keys only
    }
  }
  if (/^\d+$/.test(raw)) {
    try {
      keys.add(`0x${BigInt(raw).toString(16)}`);
    } catch {
      // keep the decimal key only
    }
  }
  return Array.from(keys);
}

function resolveDescriptorPath(
  descriptor: Erc7730Descriptor | undefined,
  path: string
): unknown {
  if (!descriptor || !path.startsWith("$.")) return undefined;
  let node: unknown = descriptor;
  for (const part of path.slice(2).split(".")) {
    if (!part) continue;
    if (!isRecord(node)) return undefined;
    node = node[part];
  }
  return node;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isPresent(value: unknown): boolean {
  return value !== undefined && value !== null;
}

function valuesEquivalent(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === undefined || a === null || b === undefined || b === null)
    return false;

  const addressA = typeof a === "string" ? normalizeAddress(a) : null;
  const addressB = typeof b === "string" ? normalizeAddress(b) : null;
  if (addressA || addressB) return addressA !== null && addressA === addressB;

  try {
    const bigA = toBigIntValue(a);
    const bigB = toBigIntValue(b);
    if (bigA !== null || bigB !== null) {
      return bigA !== null && bigB !== null && bigA === bigB;
    }
  } catch {
    // fall through to string comparison
  }

  return stringifyValue(a) === stringifyValue(b);
}

function toBigIntValue(value: unknown): bigint | null {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") {
    return Number.isInteger(value) ? BigInt(value) : null;
  }
  if (typeof value === "string") {
    if (/^-?\d+$/.test(value)) return BigInt(value);
    if (/^0x[0-9a-fA-F]+$/.test(value)) return BigInt(value);
  }
  return null;
}

function asIndexedString(
  value: unknown,
  itemIndex?: number
): string | undefined {
  const picked =
    Array.isArray(value) && itemIndex !== undefined ? value[itemIndex] : value;
  return typeof picked === "string" ? picked : undefined;
}

function resolveChainIdParam(
  params: Record<string, unknown>,
  input: RenderInput,
  itemIndex?: number
): number {
  const pathValue =
    typeof params.chainIdPath === "string"
      ? resolveInputPath(input, params.chainIdPath)
      : undefined;
  const chainId = resolveChainIdValue(
    pathValue !== undefined
      ? Array.isArray(pathValue) && itemIndex !== undefined
        ? pathValue[itemIndex]
        : pathValue
      : params.chainId
  );
  return chainId ?? input.chainId;
}

function resolveChainIdValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "bigint") {
    if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) return null;
    return Number(value);
  }
  if (typeof value === "string") {
    if (/^\d+$/.test(value)) return Number(value);
    if (/^0x[0-9a-fA-F]+$/.test(value)) return Number(BigInt(value));
  }
  return null;
}

function resolveSenderAddressAlias(
  address: string,
  params: Record<string, unknown>,
  input: RenderInput
): string {
  const aliases = Array.isArray(params.senderAddress)
    ? params.senderAddress
    : params.senderAddress !== undefined
      ? [params.senderAddress]
      : [];
  if (!aliases.some((item) => valuesEquivalent(item, address))) return address;
  const from = input.envelope?.from;
  return typeof from === "string" && normalizeAddress(from) ? from : address;
}

function resolveEnumMap(
  params: Record<string, unknown>
): Record<string, string> | null {
  const node = isRecord(params.$ref)
    ? params.$ref
    : isRecord(params.values)
      ? params.values
      : params;
  const entries = Object.entries(node)
    .filter(([, value]) => typeof value === "string")
    .map(([key, value]) => [key, value as string]);
  return entries.length ? Object.fromEntries(entries) : null;
}

function descriptorTokenMetadata(
  descriptor: Erc7730Descriptor | undefined,
  tokenAddress: string | undefined,
  chainId: number,
  input: RenderInput
): TokenMetadataHint | undefined {
  if (tokenAddress) {
    const runtime =
      input.tokenMetadata?.[runtimeTokenMetadataKey(chainId, tokenAddress)];
    if (runtime) return runtime;
  }

  const meta = descriptor?.metadata?.token;
  if (!meta?.ticker || meta.decimals === undefined) return undefined;
  const target =
    typeof input.envelope?.to === "string" ? input.envelope.to : undefined;
  if (
    tokenAddress &&
    target &&
    normalizeAddress(tokenAddress) !== normalizeAddress(target)
  ) {
    return undefined;
  }
  return {
    symbol: meta.ticker,
    decimals: meta.decimals,
  };
}

export function runtimeTokenMetadataKey(
  chainId: number,
  tokenAddress: string
): string {
  return `${chainId}:${tokenAddress.toLowerCase()}`;
}

function parseInteroperableAddress(value: string): { address?: string } | null {
  const direct = normalizeAddress(value);
  if (direct) return { address: direct };

  // Best-effort ERC-7930 compact bytes support. The terminal 20 bytes are the
  // account address for EVM variants; if the bytes do not look like that, the
  // caller falls back to raw display instead of inventing an identity.
  if (!/^0x[0-9a-fA-F]{40,}$/.test(value)) return null;
  const tail = `0x${value.slice(-40)}`;
  return normalizeAddress(tail) ? { address: tail } : null;
}

function shortAddress(value: string): string {
  return value.length >= 10
    ? `${value.slice(0, 6)}...${value.slice(-4)}`
    : value;
}

function isNativeCurrencyToken(
  tokenAddress: string | undefined,
  params: Record<string, unknown>
): boolean {
  if (!tokenAddress) return false;
  const normalized = normalizeAddress(tokenAddress);
  if (!normalized) return false;

  const configured = collectNativeCurrencyAddresses(
    params.nativeCurrencyAddress
  );
  if (configured.includes(normalized)) return true;

  // Common sentinel addresses used by swap aggregators for native currency.
  return (
    normalized === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" ||
    normalized === "0x0000000000000000000000000000000000000000"
  );
}

function collectNativeCurrencyAddresses(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  return values
    .map((item) => (typeof item === "string" ? normalizeAddress(item) : null))
    .filter((item): item is string => !!item);
}

function normalizeAddress(value: string): string | null {
  return /^0x[0-9a-fA-F]{40}$/.test(value) ? value.toLowerCase() : null;
}

function stringifyAmount(v: unknown): string {
  if (typeof v === "bigint") return v.toString();
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v;
  return String(v);
}

function nativeDecimalsForChain(chainId: number): number {
  const entry = chainIdToChain[chainId];
  return normalizeDecimals(entry?.nativeCurrency.decimals) ?? 18;
}

function normalizeDecimals(value: unknown): number | null {
  if (typeof value !== "number") return null;
  if (!Number.isInteger(value) || value < 0 || value > 255) return null;
  return value;
}

function formatDecimalRaw(raw: string, decimals: number): string {
  if (decimals <= 0) return raw;
  let big: bigint;
  try {
    big = BigInt(raw);
  } catch {
    return raw;
  }
  const neg = big < 0n;
  if (neg) big = -big;
  const divisor = 10n ** BigInt(decimals);
  const whole = big / divisor;
  const frac = big % divisor;
  if (frac === 0n) return `${neg ? "-" : ""}${whole.toString()}`;
  let fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  if (fracStr.length > 8) fracStr = fracStr.slice(0, 8);
  return `${neg ? "-" : ""}${whole.toString()}.${fracStr}`;
}

function formatUnitDisplay(
  raw: string,
  decimals: number,
  base: string | undefined,
  prefix: boolean
): string {
  const unit = base || "";
  if (!prefix) return `${formatDecimalRaw(raw, decimals)}${unit}`;

  const n = decimalRawToNumber(raw, decimals);
  if (n === null || n === 0) return `${formatDecimalRaw(raw, decimals)}${unit}`;

  const prefixes: Record<number, string> = {
    [-24]: "y",
    [-21]: "z",
    [-18]: "a",
    [-15]: "f",
    [-12]: "p",
    [-9]: "n",
    [-6]: "u",
    [-3]: "m",
    0: "",
    3: "k",
    6: "M",
    9: "G",
    12: "T",
    15: "P",
    18: "E",
    21: "Z",
    24: "Y",
  };
  const magnitude = Math.floor(Math.log10(Math.abs(n)) / 3) * 3;
  const clamped = Math.max(-24, Math.min(24, magnitude));
  const scaled = n / 10 ** clamped;
  return `${formatCompactNumber(scaled)}${prefixes[clamped] || ""}${unit}`;
}

function decimalRawToNumber(raw: string, decimals: number): number | null {
  let big: bigint;
  try {
    big = BigInt(raw);
  } catch {
    return null;
  }
  const sign = big < 0n ? -1 : 1;
  if (big < 0n) big = -big;
  if (decimals <= 0) return sign * Number(big);
  const divisor = 10n ** BigInt(decimals);
  const whole = Number(big / divisor);
  const frac = Number(big % divisor) / Number(divisor);
  const value = sign * (whole + frac);
  return Number.isFinite(value) ? value : null;
}

function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  const abs = Math.abs(value);
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return value.toFixed(digits).replace(/\.?0+$/, "");
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return String(seconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}:${String(secs).padStart(2, "0")}`;
}

function stringifyValue(v: unknown): string {
  if (v === null) return "null";
  if (typeof v === "string") return v;
  if (typeof v === "bigint") return v.toString();
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
