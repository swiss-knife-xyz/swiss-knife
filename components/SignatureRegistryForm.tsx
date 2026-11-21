"use client";

import { useId, useRef, useState } from "react";
import {
  Box,
  Button,
  Alert,
  AlertIcon,
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
import { submitSignatureImport } from "@/lib/signatureRegistry";

// A different calldata selector starts a fresh form and submission status.
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
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [status, setStatus] = useState<"imported" | "duplicated">();
  const [error, setError] = useState("");

  function reset() {
    setStatus(undefined);
    setError("");
  }

  async function submit() {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    reset();
    try {
      // Clicking the explicitly labelled submit button authorizes this import.
      setStatus(await submitSignatureImport(signature, selector, true));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Submission was not confirmed."
      );
    } finally {
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
          <ModalHeader
            as="h2"
            fontSize="md"
            fontWeight="semibold"
            lineHeight="short"
            px={6}
            pt={5}
            pb={2}
            pr={12}
            mb={0}
          >
            Add a missing signature
          </ModalHeader>
          <ModalCloseButton isDisabled={busy} />
          <ModalBody px={6} pt={0} pb={6} textAlign="left">
            <Stack
              as="form"
              spacing={4}
              fontSize="sm"
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
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
              <FormControl pt={2}>
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
                colorScheme="blue"
                alignSelf="center"
                mt={1}
                isLoading={busy}
                loadingText="Checking and submitting"
              >
                Submit to Sourcify
              </Button>
              {error && (
                <Alert status="error" role="alert" borderRadius="md">
                  <AlertIcon />
                  {error}
                </Alert>
              )}
              {status && (
                <Alert
                  status={status === "imported" ? "success" : "info"}
                  role="status"
                  borderRadius="md"
                >
                  <AlertIcon />
                  {status === "imported"
                    ? "Signature submitted to Sourcify."
                    : "This signature already exists on Sourcify."}
                </Alert>
              )}
            </Stack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
