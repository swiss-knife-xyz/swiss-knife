import React from "react";
import {
  GridItem,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Text,
  Center,
  Image,
  Icon,
} from "@chakra-ui/react";
import { FiGlobe } from "react-icons/fi";
import { ExplorerData, ExplorerType } from "@/types";
import { generateUrl } from "@/utils";
import { c, chainIdToChain, chainIdToImage } from "@/data/common";

interface Params {
  isModalOpen: boolean;
  closeModal: () => void;
  explorerName: string;
  explorerData: ExplorerData;
  explorerType: ExplorerType;
  supportedChainIds: number[];
  addressOrTx: string;
}

export const ExplorerChainModal = ({
  isModalOpen,
  closeModal,
  explorerName,
  explorerData,
  explorerType,
  supportedChainIds,
  addressOrTx,
}: Params) => {
  const compact = supportedChainIds.length <= 4;
  const chainIds = [...supportedChainIds].sort((a, b) => {
    if (a === b) return 0;
    if (a === c.mainnet.id) return -1;
    if (b === c.mainnet.id) return 1;
    return chainIdToChain[a].name.localeCompare(chainIdToChain[b].name);
  });

  return (
    <Modal isOpen={isModalOpen} onClose={closeModal} isCentered scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
      <ModalContent
        w="full"
        mx={3}
        my={4}
        maxW={{ base: "calc(100vw - 1.5rem)", md: compact ? "28rem" : "52rem" }}
        maxH="calc(100dvh - 2rem)"
        bg="bg.base"
        border="1px solid"
        borderColor="border.default"
        rounded="lg"
      >
        <ModalHeader px={4} py={4} pr={12} fontSize="md" bg="bg.subtle" roundedTop="lg" flexShrink={0}>
          {explorerName}
        </ModalHeader>
        <ModalCloseButton top={3} right={3} />
        <ModalBody
          p={{ base: 3, md: 4 }}
          minH={0}
          overflowY="auto"
          overflowX="hidden"
          sx={{
            scrollbarWidth: "thin",
            scrollbarColor: "var(--chakra-colors-whiteAlpha-300) transparent",
            "&::-webkit-scrollbar": { width: "6px" },
            "&::-webkit-scrollbar-thumb": { background: "whiteAlpha.300", borderRadius: "full" },
          }}
        >
          <SimpleGrid columns={{ base: 2, md: compact ? 2 : 3, lg: compact ? 2 : 4 }} gap={3}>
            {chainIds.map(chainId => (
              <GridItem
                as="a"
                key={chainId}
                href={generateUrl(explorerData.urlLayout, explorerData.chainIdToLabel[chainId], addressOrTx, explorerType)}
                target="_blank"
                rel="noopener noreferrer"
                minW={0}
                border="1px solid"
                borderColor="border.default"
                bg="bg.subtle"
                color="text.primary"
                rounded="md"
                _hover={{ bg: "bg.muted", borderColor: "border.strong", textDecoration: "none" }}
                _focusVisible={{ outline: "2px solid", outlineColor: "primary.400" }}
              >
                <Center flexDir="column" h="full" minH="96px" p={3} gap={2}>
                  <Image
                    boxSize={8}
                    bg="white"
                    objectFit="contain"
                    flexShrink={0}
                    src={chainIdToImage[chainId]}
                    alt=""
                    borderRadius="full"
                    fallback={<Center boxSize={8}><Icon as={FiGlobe} boxSize={6} color="text.secondary" /></Center>}
                  />
                  <Text fontSize="sm" textAlign="center" color="inherit" overflowWrap="anywhere">
                    {chainIdToChain[chainId].name}
                  </Text>
                </Center>
              </GridItem>
            ))}
          </SimpleGrid>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
