import { FunctionFragment } from "ethers";
import { z } from "zod";

const importDetails = z.object({
  imported: z.record(z.string()),
  duplicated: z.record(z.string()),
  invalid: z.array(z.string()),
});
const importResponse = z.object({
  ok: z.literal(true),
  result: z.object({ function: importDetails }),
});

export async function submitSignatureImport(
  signature: string,
  selector: string,
  consent: boolean,
  fetcher: typeof fetch = fetch
): Promise<"imported" | "duplicated"> {
  if (consent !== true)
    throw new Error("Explicit public-submission consent is required.");
  const preview = previewSignatureImport(signature, selector);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetcher(SIGNATURE_IMPORT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preview.body),
      credentials: "omit",
      referrerPolicy: "no-referrer",
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("Registry request failed.");
    const text = await response.text();
    if (text.length > 65536) throw new Error("Unexpected registry response.");
    const details = importResponse.parse(JSON.parse(text)).result.function;
    if (details.invalid.includes(signature))
      throw new Error("Registry rejected the signature.");
    for (const status of ["imported", "duplicated"] as const) {
      if (
        Object.hasOwn(details[status], signature) &&
        details[status][signature] === preview.selector
      ) {
        return status;
      }
    }
    throw new Error("Registry did not confirm this signature and selector.");
  } catch {
    // Do not retry a potentially completed public write or display untrusted errors.
    throw new Error(
      "Submission was not confirmed. It may have reached Sourcify; check the registry before trying again."
    );
  } finally {
    clearTimeout(timeout);
  }
}

// Sourcify's current published API; never fall back to historical OpenChain hosts.
export const SIGNATURE_IMPORT_URL =
  "https://api.4byte.sourcify.dev/signature-database/v1/import";

export function previewSignatureImport(signature: string, selector: string) {
  if (!/^0x[0-9a-fA-F]{8}$/.test(selector)) {
    throw new Error(
      "Enter an exact 4-byte selector (0x and 8 hex characters)."
    );
  }
  if (
    signature.length > 2048 ||
    !/^[A-Za-z_$][A-Za-z0-9_$]*\(/.test(signature)
  ) {
    throw new Error(
      "Enter one canonical function signature, e.g. transfer(address,uint256)."
    );
  }
  let fragment: FunctionFragment;
  try {
    fragment = FunctionFragment.from(signature);
  } catch {
    throw new Error("Invalid function signature.");
  }
  if (/\[0\]/.test(signature) || fragment.format("sighash") !== signature) {
    throw new Error(
      "Use the canonical signature: no names, spaces, modifiers or aliases such as uint."
    );
  }
  if (fragment.selector !== selector.toLowerCase()) {
    throw new Error(
      `Signature hashes to ${fragment.selector}, not ${selector}.`
    );
  }
  return {
    signature,
    selector: fragment.selector,
    destination: SIGNATURE_IMPORT_URL,
    body: { function: [signature] },
  };
}
