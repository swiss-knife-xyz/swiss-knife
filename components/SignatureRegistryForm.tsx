"use client";

import { useId, useRef, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Code,
  FormControl,
  FormLabel,
  Input,
  Link,
  Stack,
  Text,
} from "@chakra-ui/react";
import {
  previewSignatureImport,
  submitSignatureImport,
} from "@/lib/signatureRegistry";

// Remount on target changes: an old preview/consent must never authorize a new selector.
export function SignatureRegistryForm({
  selector = "",
}: {
  selector?: string;
}) {
  const target = /^0x[0-9a-fA-F]{8}$/.test(selector) ? selector : "";
  return <RegistryForm key={selector} target={target} />;
}

function RegistryForm({ target }: { target: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [signature, setSignature] = useState("");
  const [selector, setSelector] = useState(target);
  const [preview, setPreview] =
    useState<ReturnType<typeof previewSignatureImport>>();
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function reset() {
    setPreview(undefined);
    setConsent(false);
    setMessage("");
    setError("");
  }

  async function submit() {
    if (!preview || !consent || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const status = await submitSignatureImport(
        preview.signature,
        preview.selector,
        consent
      );
      setMessage(
        status === "imported"
          ? "Imported to Sourcify's public registry."
          : "Signature already exists in Sourcify's public registry."
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Submission was not confirmed."
      );
    } finally {
      setPreview(undefined);
      setConsent(false);
      setBusy(false);
      submitting.current = false;
    }
  }

  return (
    <Box my={4} w="full" minW={0}>
      <Button
        size="sm"
        variant="outline"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        isDisabled={busy}
        onClick={() => {
          reset();
          setOpen(!open);
        }}
      >
        {open ? "Close signature submission" : "Add a missing signature"}
      </Button>
      {open && (
        <Box
          id={`${id}-panel`}
          mt={3}
          p={4}
          borderWidth="1px"
          borderRadius="md"
          minW={0}
        >
          <Stack
            as="form"
            spacing={3}
            onSubmit={(event) => {
              event.preventDefault();
              if (busy) return;
              reset();
              try {
                setPreview(previewSignatureImport(signature, selector));
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : "Invalid signature."
                );
              }
            }}
          >
            <Text fontSize="sm">
              Know the original function signature? Submit it to{" "}
              <Link
                href="https://docs.sourcify.dev/docs/repository/signature-database/"
                isExternal
                textDecoration="underline"
              >
                Sourcify
              </Link>
              , the public registry replacing OpenChain. Do not submit guesses
              or private signatures. A selector match can collide and does not
              verify a contract&apos;s ABI or make a call safe.
            </Text>
            <FormControl>
              <FormLabel htmlFor={`${id}-selector`}>4-byte selector</FormLabel>
              <Input
                id={`${id}-selector`}
                fontFamily="mono"
                value={selector}
                isReadOnly={!!target}
                isDisabled={busy}
                maxLength={10}
                placeholder="0xa9059cbb"
                onChange={(e) => {
                  reset();
                  setSelector(e.target.value);
                }}
              />
            </FormControl>
            <FormControl>
              <FormLabel htmlFor={`${id}-signature`}>
                Canonical function signature
              </FormLabel>
              <Input
                id={`${id}-signature`}
                fontFamily="mono"
                value={signature}
                isDisabled={busy}
                maxLength={2048}
                autoComplete="off"
                placeholder="transfer(address,uint256)"
                onChange={(e) => {
                  reset();
                  setSignature(e.target.value);
                }}
              />
            </FormControl>
            <Button type="submit" alignSelf="start" isDisabled={busy}>
              Preview public submission
            </Button>
            {preview && (
              <Stack spacing={3} minW={0}>
                <Text fontSize="sm">POST destination:</Text>
                <Code whiteSpace="normal" overflowWrap="anywhere">
                  {preview.destination}
                </Code>
                <Text fontSize="sm">
                  Exact JSON payload (no calldata, address, wallet or chain
                  data):
                </Text>
                <Code whiteSpace="pre-wrap" overflowWrap="anywhere">
                  {JSON.stringify(preview.body)}
                </Code>
                <Text fontSize="sm">Matching selector: {preview.selector}</Text>
                <Checkbox
                  isChecked={consent}
                  isDisabled={busy}
                  onChange={(e) => setConsent(e.target.checked)}
                >
                  I want to publish this signature to Sourcify. Its public
                  service will receive the signature and my IP address.
                </Checkbox>
                <Button
                  type="button"
                  alignSelf="start"
                  maxW="full"
                  whiteSpace="normal"
                  height="auto"
                  minH={10}
                  isDisabled={!consent || busy}
                  isLoading={busy}
                  onClick={submit}
                >
                  Submit signature to Sourcify
                </Button>
              </Stack>
            )}
            {error && (
              <Text role="alert" color="red.400">
                {error}
              </Text>
            )}
            {message && (
              <Text role="status">
                {message} This is not ABI verification; decoding is not changed
                automatically.
              </Text>
            )}
          </Stack>
        </Box>
      )}
    </Box>
  );
}
