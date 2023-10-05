import React from "react";
import {
  Box,
  GridItem,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Text,
  Link,
  Center,
  Image,
} from "@chakra-ui/react";
import { ExplorerData, ExplorerType } from "@/types";
import { generateUrl } from "@/utils";
import { chainIdToChain, chainIdToImage } from "@/data/common";

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
  return (
    <Modal isOpen={isModalOpen} onClose={closeModal} isCentered>
      <ModalOverlay bg="none" backdropFilter="auto" backdropBlur="3px" />
      <ModalContent
        minW={{
          base: 0,
          sm: "30rem",
          md: "40rem",
          lg: "60rem",
        }}
        bg={"bg.900"}
      >
        <ModalHeader bg="whiteAlpha.100" roundedTop={"lg"}>
          {explorerName}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody bg="blackAlpha.400">
          <Box py="2rem" px={{ base: 0, md: "2rem" }}>
            <Text>Select from the supported chains:</Text>
            <Box
              minH="25rem"
              maxH="25rem"
              overflow="scroll"
              overflowX="auto"
              overflowY="auto"
            >
              <SimpleGrid pt="1rem" columns={{ base: 2, md: 3, lg: 4 }} gap={6}>
                {supportedChainIds.map((chainId) => (
                  <GridItem
                    key={chainId}
                    border="2px solid"
                    borderColor={"gray.500"}
                    bg={"white"}
                    color={"black"}
                    _hover={{
                      cursor: "pointer",
                      bgColor: "gray.600",
                      color: "white",
                    }}
                    rounded="lg"
                  >
                    <Link
                      href={generateUrl(
                        explorerData.urlLayout,
                        explorerData.chainIdToLabel[chainId],
                        addressOrTx,
                        explorerType
                      )}
                      isExternal
                    >
                      <Center flexDir={"column"} h="100%" p="1rem">
                        <Image
                          bg="white"
                          w="2rem"
                          src={chainIdToImage[chainId]}
                          alt={explorerName}
                          borderRadius="full"
                        />
                        <Text mt="0.5rem" textAlign={"center"}>
                          {chainIdToChain[chainId].name}
                        </Text>
                      </Center>
                    </Link>
                  </GridItem>
                ))}
              </SimpleGrid>
            </Box>
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
