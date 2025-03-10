import {
  Box,
  Button,
  Divider,
  Flex,
  Heading,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  VStack,
} from "@chakra-ui/react";
import { SessionProposal } from "../types";

interface SessionProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSessionProposal: SessionProposal | null;
  onApprove: () => Promise<void>;
  onReject: () => Promise<void>;
}

export default function SessionProposalModal({
  isOpen,
  onClose,
  currentSessionProposal,
  onApprove,
  onReject,
}: SessionProposalModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isCentered
      size={{ base: "sm", md: "lg" }}
      blockScrollOnMount={true}
    >
      <ModalOverlay bg="none" backdropFilter="auto" backdropBlur="5px" />
      <ModalContent
        bg="bg.900"
        color="white"
        maxW={{
          base: "90%",
          sm: "30rem",
          md: "40rem",
        }}
        zIndex="1400"
      >
        <ModalHeader borderBottomWidth="1px" borderColor="whiteAlpha.200">
          Session Proposal
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {currentSessionProposal && (
            <VStack spacing={4} align="stretch">
              <Flex
                alignItems={{ base: "flex-start", md: "center" }}
                direction={{ base: "column", md: "row" }}
                gap={{ base: 3, md: 0 }}
              >
                {currentSessionProposal.params.proposer.metadata.icons &&
                  currentSessionProposal.params.proposer.metadata.icons[0] && (
                    <Box
                      as="img"
                      src={
                        currentSessionProposal.params.proposer.metadata.icons[0]
                      }
                      alt={currentSessionProposal.params.proposer.metadata.name}
                      boxSize={{ base: "40px", md: "48px" }}
                      borderRadius="md"
                      mr={{ base: 0, md: 4 }}
                    />
                  )}
                <Box>
                  <Heading size={{ base: "sm", md: "md" }}>
                    {currentSessionProposal.params.proposer.metadata.name}
                  </Heading>
                  <Text fontSize="sm" color="whiteAlpha.700">
                    {currentSessionProposal.params.proposer.metadata.url}
                  </Text>
                </Box>
              </Flex>

              <Divider />

              <Box>
                <Text fontWeight="bold" mb={2}>
                  Description:
                </Text>
                <Text fontSize={{ base: "sm", md: "md" }}>
                  {currentSessionProposal.params.proposer.metadata.description}
                </Text>
              </Box>

              <Box>
                <Text fontWeight="bold" mb={2}>
                  Requested Permissions:
                </Text>
                <VStack spacing={2} align="stretch">
                  {Object.entries(
                    currentSessionProposal.params.requiredNamespaces
                  ).map(([key, value]) => (
                    <Box
                      key={key}
                      p={{ base: 2, md: 3 }}
                      borderWidth={1}
                      borderRadius="md"
                      borderColor="whiteAlpha.300"
                      bg="whiteAlpha.100"
                    >
                      <Text fontWeight="bold">{key}</Text>
                      <Text fontSize="sm">
                        Chains: {value.chains.join(", ")}
                      </Text>
                      <Text fontSize="sm">
                        Methods: {value.methods.join(", ")}
                      </Text>
                      <Text fontSize="sm">
                        Events: {value.events.join(", ")}
                      </Text>
                    </Box>
                  ))}
                </VStack>
              </Box>
            </VStack>
          )}
        </ModalBody>
        <ModalFooter borderTopWidth="1px" borderColor="whiteAlpha.200">
          <Button
            colorScheme="red"
            mr={3}
            onClick={onReject}
            size={{ base: "sm", md: "md" }}
          >
            Reject
          </Button>
          <Button
            colorScheme="blue"
            onClick={onApprove}
            size={{ base: "sm", md: "md" }}
          >
            Approve
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
