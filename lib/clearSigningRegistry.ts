import path from "node:path";
import { gunzipSync } from "node:zlib";
import { Parser } from "tar";

export const REGISTRY_SOURCE =
  "https://github.com/ethereum/clear-signing-erc7730-registry@master";
export const REGISTRY_RAW_BASE =
  "https://raw.githubusercontent.com/ethereum/clear-signing-erc7730-registry/master";
export const REGISTRY_ARCHIVE_URL =
  "https://codeload.github.com/ethereum/clear-signing-erc7730-registry/tar.gz/refs/heads/master";
export const REGISTRY_REVALIDATE_SECONDS = 24 * 60 * 60;
export const REGISTRY_MAX_ARCHIVE_BYTES = 8 * 1024 * 1024;
export const REGISTRY_MAX_UNPACKED_BYTES = 32 * 1024 * 1024;
export const REGISTRY_MAX_DESCRIPTOR_BYTES = 512 * 1024;

export type DescriptorKind = "calldata" | "eip712";
export interface RegistryEntry {
  calldata?: string | string[];
  eip712?: string | string[];
}
export interface RegistrySnapshot {
  updatedAt: string;
  source: string;
  entries: Record<string, Record<string, RegistryEntry>>;
}
export interface RegistryDescriptor {
  $schema?: string;
  includes?: string;
  context?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  display?: { formats?: Record<string, unknown> };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function parseRegistryDescriptor(value: unknown): RegistryDescriptor {
  if (
    !isRecord(value) ||
    (value.includes !== undefined && typeof value.includes !== "string") ||
    (value.context !== undefined && !isRecord(value.context)) ||
    (value.metadata !== undefined && !isRecord(value.metadata)) ||
    (value.display !== undefined &&
      (!isRecord(value.display) ||
        (value.display.formats !== undefined &&
          !isRecord(value.display.formats))))
  ) {
    throw new Error("Invalid registry descriptor");
  }
  return value as RegistryDescriptor;
}

/** Only public registry/ERC templates; never URLs, traversal, or test payloads. */
export function isRegistryPath(value: string): boolean {
  return (
    /^(registry|ercs)\/(?:[A-Za-z0-9_.+-]+\/)*[A-Za-z0-9_.+-]+\.json$/.test(
      value
    ) &&
    !value
      .split("/")
      .some(
        (part) =>
          part === "." || part === ".." || /^tests?(?:v?\d+)?$/i.test(part)
      )
  );
}

export function resolveRegistryInclude(
  origin: string,
  relative: string
): string {
  if (!relative || relative.startsWith("/") || relative.includes(":")) {
    throw new Error("Invalid registry include");
  }
  const resolved = path.posix.normalize(
    path.posix.join(path.posix.dirname(origin), relative)
  );
  if (!isRegistryPath(resolved))
    throw new Error("Registry include escapes descriptor directories");
  return resolved;
}

export function mergeRegistryDescriptor(
  inherited: RegistryDescriptor,
  own: RegistryDescriptor
): RegistryDescriptor {
  const { includes: _includes, ...rest } = own;
  return {
    ...rest,
    context: { ...inherited.context, ...own.context },
    metadata: { ...inherited.metadata, ...own.metadata },
    display: {
      ...inherited.display,
      ...own.display,
      formats: { ...inherited.display?.formats, ...own.display?.formats },
    },
  };
}

/** Bound streamed bytes as well as elapsed time; no credentials or redirects. */
export async function fetchRegistryBytes(
  url: string,
  maxBytes: number,
  timeoutMs = 5000
): Promise<Buffer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const response = await fetch(url, {
      cache: "no-store",
      redirect: "error",
      credentials: "omit",
      signal: controller.signal,
    });
    if (!response.ok || !response.body)
      throw new Error(`Registry fetch failed: ${response.status}`);
    reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes)
        throw new Error("Registry response exceeds byte limit");
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  } finally {
    clearTimeout(timer);
    controller.abort();
    await reader?.cancel().catch(() => {});
  }
}

/** Parse in memory only. No archive member is ever extracted to the filesystem. */
export async function readRegistryArchive(
  archive: Buffer
): Promise<Map<string, RegistryDescriptor>> {
  if (archive.length > REGISTRY_MAX_ARCHIVE_BYTES)
    throw new Error("Registry archive exceeds byte limit");
  const unpacked = gunzipSync(Uint8Array.from(archive), {
    maxOutputLength: REGISTRY_MAX_UNPACKED_BYTES,
  });
  const files = new Map<string, RegistryDescriptor>();
  await new Promise<void>((resolve, reject) => {
    let failure: Error | undefined;
    const parser = new Parser({
      strict: true,
      filter: (name) => isRegistryPath(name.slice(name.indexOf("/") + 1)),
      onReadEntry: (entry) => {
        const name = entry.path.slice(entry.path.indexOf("/") + 1);
        if (
          entry.type !== "File" ||
          entry.size > REGISTRY_MAX_DESCRIPTOR_BYTES ||
          files.has(name)
        ) {
          failure = new Error(
            "Invalid, oversized, or duplicate registry member"
          );
          entry.resume();
          return;
        }
        const chunks: Buffer[] = [];
        entry.on("data", (chunk: Buffer) => chunks.push(chunk));
        entry.on("end", () => {
          try {
            files.set(
              name,
              parseRegistryDescriptor(
                JSON.parse(
                  Buffer.concat(
                    chunks.map((chunk) => Uint8Array.from(chunk))
                  ).toString("utf8")
                )
              )
            );
          } catch (error) {
            failure = error as Error;
          }
        });
      },
    });
    parser.on("error", reject);
    parser.on("end", () => (failure ? reject(failure) : resolve()));
    parser.end(unpacked);
  });
  if (!files.size) throw new Error("Registry archive contains no descriptors");
  return files;
}

export function buildRegistrySnapshot(
  files: Map<string, RegistryDescriptor>
): RegistrySnapshot {
  const entries: RegistrySnapshot["entries"] = {};
  const resolved = new Map<string, RegistryDescriptor>();
  function resolve(file: string, ancestors: string[] = []): RegistryDescriptor {
    if (ancestors.includes(file) || ancestors.length > 3)
      throw new Error("Registry include cycle/depth exceeded");
    const cached = resolved.get(file);
    if (cached) return cached;
    const own = files.get(file);
    if (!own) throw new Error(`Missing registry include: ${file}`);
    const descriptor = own.includes
      ? mergeRegistryDescriptor(
          resolve(resolveRegistryInclude(file, own.includes), [
            ...ancestors,
            file,
          ]),
          own
        )
      : own;
    resolved.set(file, descriptor);
    return descriptor;
  }
  for (const file of [...files.keys()].sort()) {
    if (!file.startsWith("registry/")) continue;
    const descriptor = resolve(file);
    if (!Object.keys(descriptor.display?.formats ?? {}).length) continue;
    for (const [kind, context] of [
      ["calldata", "contract"],
      ["eip712", "eip712"],
    ] as const) {
      const node = descriptor.context?.[context];
      if (!isRecord(node)) continue;
      if (node.deployments !== undefined && !Array.isArray(node.deployments))
        throw new Error("Invalid registry deployments");
      for (const deployment of node.deployments ?? []) {
        if (
          !isRecord(deployment) ||
          !Number.isSafeInteger(deployment.chainId) ||
          (deployment.chainId as number) <= 0 ||
          typeof deployment.address !== "string" ||
          !/^0x[0-9a-fA-F]{40}$/.test(deployment.address)
        ) {
          throw new Error(`Invalid registry deployment: ${file}`);
        }
        const chainId = String(deployment.chainId);
        const address = deployment.address.toLowerCase();
        const slot = ((entries[chainId] ??= {})[address] ??= {});
        const paths = (slot[kind] ??= []) as string[];
        if (!paths.includes(file)) paths.push(file);
      }
    }
  }
  if (!Object.keys(entries).length)
    throw new Error("Registry snapshot contains no deployments");
  // Stay below the Next/Vercel Data Cache entry limit; never publish a partial index.
  if (Buffer.byteLength(JSON.stringify(entries)) > 1024 * 1024)
    throw new Error("Registry index exceeds cache budget");
  const sorted = Object.fromEntries(
    Object.entries(entries).map(([chainId, addresses]) => [
      chainId,
      Object.fromEntries(
        Object.entries(addresses).sort(([a], [b]) => a.localeCompare(b))
      ),
    ])
  );
  return {
    updatedAt: new Date().toISOString(),
    source: REGISTRY_SOURCE,
    entries: sorted,
  };
}

export async function refreshRegistrySnapshot(): Promise<RegistrySnapshot> {
  const archive = await fetchRegistryBytes(
    REGISTRY_ARCHIVE_URL,
    REGISTRY_MAX_ARCHIVE_BYTES
  );
  return buildRegistrySnapshot(await readRegistryArchive(archive));
}
