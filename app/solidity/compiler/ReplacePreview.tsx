"use client";
import {
  Box,
  Button,
  HStack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Text,
  VStack,
} from "@chakra-ui/react";
import { ReplaceAll } from "lucide-react";
import type { ReplacementPlan } from "@/lib/solidity/workspaceSearch";

export function ReplacePreview({
  plan,
  stale,
  onClose,
  onApply,
}: {
  plan: ReplacementPlan | null;
  stale: boolean;
  onClose(): void;
  onApply(): void;
}) {
  return (
    <Modal isOpen={!!plan} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent bg="bg.muted">
        <ModalHeader pr={12}>
          Review replacements
          <Text fontSize="sm" color="text.secondary" mt={1}>
            {plan?.count} replacements in {plan?.files.length} files
          </Text>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack align="stretch" spacing={3}>
            {plan?.files.map((file) => (
              <Box
                key={file.id}
                borderWidth="1px"
                borderColor="border.default"
                borderRadius="lg"
                overflow="hidden"
              >
                <HStack px={3} py={2} bg="bg.subtle" justify="space-between">
                  <Text fontSize="sm" overflowWrap="anywhere">
                    {file.path}
                  </Text>
                  <Text fontSize="xs" color="text.secondary">
                    {file.count}
                  </Text>
                </HStack>
                {file.preview.map((line) => (
                  <Box
                    key={line.line}
                    p={3}
                    borderTopWidth="1px"
                    borderColor="border.default"
                    fontFamily="mono"
                    fontSize="xs"
                    overflowWrap="anywhere"
                    whiteSpace="pre-wrap"
                  >
                    <Text fontSize="xs" color="text.tertiary" mb={1}>
                      Line {line.line}
                    </Text>
                    <Text color="red.300">− {line.before}</Text>
                    <Text color="green.300">+ {line.after}</Text>
                  </Box>
                ))}
                {file.preview.length >= 100 && (
                  <Text p={3} fontSize="xs" color="text.secondary">
                    Preview limited to 100 changed lines. All replacements will
                    be applied.
                  </Text>
                )}
              </Box>
            ))}
            {stale && (
              <Text role="alert" color="yellow.300" fontSize="sm">
                Files changed. Close this preview and search again.
              </Text>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter gap={2}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            leftIcon={<ReplaceAll size={15} />}
            isDisabled={stale || !plan?.files.length}
            onClick={onApply}
          >
            Replace all
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
