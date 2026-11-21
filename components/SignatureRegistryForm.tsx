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
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
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

  const labelProps = {
    fontSize: "xs",
    fontWeight: "medium",
    color: "whiteAlpha.700",
    mb: 1,
  } as const;

  function close() {
    // Never dismiss mid-submission; closing never submits.
    if (busy || submitting.current) return;
    reset();
    setOpen(false);
  }

  return (
    <Box w="full" minW={0} display="flex" justifyContent="flex-end">
      <Button
        size="sm"
        variant="ghost"
        color="whiteAlpha.700"
        fontWeight="medium"
        _hover={{ bg: "whiteAlpha.100", color: "white" }}
        aria-haspopup="dialog"
        isDisabled={busy}
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        Add a missing signature
      </Button>
      <Modal
        isOpen={open}
        onClose={close}
        isCentered
        scrollBehavior="inside"
        size={{ base: "full", sm: "lg" }}
        closeOnEsc={!busy}
        closeOnOverlayClick={!busy}
      >
        <ModalOverlay />
        <ModalContent
          bg="bg.muted"
          borderWidth={{ base: 0, sm: "1px" }}
          borderColor="whiteAlpha.200"
          borderRadius={{ base: 0, sm: "lg" }}
          mx={{ base: 0, sm: 4 }}
          maxH={{ base: "100dvh", sm: "calc(100dvh - 4rem)" }}
        >
          <ModalHeader as="h2" fontSize="md" fontWeight="semibold" pr={12}>
            Add a missing signature
          </ModalHeader>
          <ModalCloseButton isDisabled={busy} />
          <ModalBody pb={6} textAlign="left">
            <Stack
              as="form"
              spacing={3}
              fontSize="sm"
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
              <Text color="whiteAlpha.800">
                Publish a known signature to{" "}
                <Link
                  href="https://docs.sourcify.dev/docs/repository/signature-database/"
                  isExternal
                  textDecoration="underline"
                >
                  Sourcify
                </Link>
                &apos;s public registry.
              </Text>
              <FormControl>
                <FormLabel htmlFor={`${id}-selector`} {...labelProps}>
                  4-byte selector
                </FormLabel>
                <Input
                  id={`${id}-selector`}
                  size="sm"
                  borderRadius="md"
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
                <FormLabel htmlFor={`${id}-signature`} {...labelProps}>
                  Canonical function signature
                </FormLabel>
                <Input
                  id={`${id}-signature`}
                  size="sm"
                  borderRadius="md"
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
              <Button
                type="submit"
                size="sm"
                alignSelf="start"
                isDisabled={busy}
              >
                Preview public submission
              </Button>
              {preview && (
                <Stack
                  spacing={2}
                  minW={0}
                  pt={3}
                  borderTopWidth="1px"
                  borderColor="whiteAlpha.200"
                >
                  <Text {...labelProps} mb={0}>
                    POST destination
                  </Text>
                  <Code
                    fontSize="xs"
                    bg="whiteAlpha.100"
                    whiteSpace="normal"
                    overflowWrap="anywhere"
                  >
                    {preview.destination}
                  </Code>
                  <Text {...labelProps} mb={0}>
                    Exact JSON payload (no calldata, address, wallet or chain
                    data)
                  </Text>
                  <Code
                    fontSize="xs"
                    bg="whiteAlpha.100"
                    whiteSpace="pre-wrap"
                    overflowWrap="anywhere"
                  >
                    {JSON.stringify(preview.body)}
                  </Code>
                  <Text fontSize="xs" color="whiteAlpha.700">
                    Matching selector:{" "}
                    <Code fontSize="xs" bg="transparent" p={0}>
                      {preview.selector}
                    </Code>
                  </Text>
                  <Checkbox
                    size="sm"
                    pt={1}
                    isChecked={consent}
                    isDisabled={busy}
                    onChange={(e) => setConsent(e.target.checked)}
                  >
                    I want to publish this signature to Sourcify. Its public
                    service will receive the signature and my IP address.
                  </Checkbox>
                  <Button
                    type="button"
                    size="sm"
                    colorScheme="blue"
                    alignSelf="start"
                    maxW="full"
                    whiteSpace="normal"
                    height="auto"
                    minH={8}
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
                  {message} This is not ABI verification; decoding is not
                  changed automatically.
                </Text>
              )}
            </Stack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
