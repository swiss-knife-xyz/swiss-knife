import React from "react";
import {
  GridItem,
  Link,
  Center,
  Image,
  Text,
  useDisclosure,
  Spacer,
  HStack,
  AvatarGroup,
  Avatar,
  Button,
} from "@chakra-ui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart } from "@fortawesome/free-solid-svg-icons";

import { ExplorerData, ExplorerType } from "@/types";
import { checkDifferentUrlsExist, generateUrl } from "@/utils";
import { ExplorerChainModal } from "./ExplorerChainModal";
import { chainIdToChain, chainIdToImage } from "@/data/common";
import { useFavExplorerDragNDrop } from "@/hooks/useFavExplorerDragNDrop";

interface Params {
  explorerName: string;
  explorerData: ExplorerData;
  explorerType: ExplorerType;
  addressOrTx: string;
  toggleFavorite: (explorerName: string) => void;
  isFavorite?: boolean;
}

const CommonExplorerGridItem = ({
  explorerName,
  explorerData,
  explorerType,
  addressOrTx,
  toggleFavorite,
  isFavorite,
}: Params) => {
  const {
    isOpen: isModalOpen,
    onOpen: openModal,
    onClose: closeModal,
  } = useDisclosure();

  const supportedChainIds = Object.keys(explorerData.chainIdToLabel).map((k) =>
    Number(k)
  );
  const hasDifferentUrls = checkDifferentUrlsExist(explorerData);

  // this gets cached by gstatic, and independent of the addressOrTx entered.
  const baseUrlForImage = generateUrl(
    explorerData.urlLayout,
    explorerData.chainIdToLabel[supportedChainIds[0]], // the first supported chain
    "",
    explorerType
  );
  const imageUrl =
    explorerData.faviconUrl ??
    `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&size=128&url=${baseUrlForImage}`;

  return (
    <>
      <HStack>
        <Button
          size="xs"
          color={isFavorite ? "orange.500" : "white"}
          bg={isFavorite ? "orange.100" : "orange.200"}
          roundedTopRight={0}
          roundedBottomLeft={0}
          _hover={{
            color: "orange.300",
            bg: "orange.100",
          }}
          title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          onClick={() => toggleFavorite(explorerName)}
        >
          <FontAwesomeIcon icon={faHeart} />
        </Button>
        {explorerData.forContracts ? (
          <>
            <Spacer />
            <Text>🤖</Text>
          </>
        ) : null}
      </HStack>
      {hasDifferentUrls ? (
        <>
          <Center
            flexDir={"column"}
            h="100%"
            p="1rem"
            pt={"0"}
            mt={"-4"}
            onClick={openModal}
          >
            <Image
              bg={explorerData.faviconWhite ? "gray.800" : "white"}
              w="2rem"
              src={imageUrl}
              alt={explorerName}
              borderRadius="full"
            />
            <Text mt="0.5rem" textAlign={"center"}>
              {explorerName}
            </Text>
            <AvatarGroup size="2xs" spacing={"2px"} max={5}>
              {supportedChainIds
                // sort according to chain names instead of chainIds
                .sort((a, b) =>
                  chainIdToChain[a].name.localeCompare(chainIdToChain[b].name)
                )
                .map((chainId) => (
                  <Avatar
                    key={chainId}
                    src={chainIdToImage[chainId]}
                    name={chainIdToChain[chainId].name}
                    bg={"white"}
                  />
                ))}
            </AvatarGroup>
          </Center>
          <ExplorerChainModal
            isModalOpen={isModalOpen}
            closeModal={closeModal}
            explorerName={explorerName}
            explorerData={explorerData}
            explorerType={explorerType}
            addressOrTx={addressOrTx}
            supportedChainIds={supportedChainIds}
          />
        </>
      ) : (
        <Link
          href={generateUrl(
            explorerData.urlLayout,
            explorerData.chainIdToLabel[supportedChainIds[0]],
            addressOrTx,
            explorerType
          )}
          _hover={{
            textDecor: "none",
          }}
          isExternal
        >
          {/* TODO: allow bookmarking, and show the bookmarked explorers on the top */}
          <Center flexDir={"column"} h="100%" p="1rem" pt={"0"} mt={"-4"}>
            <Image
              bg="white"
              w="2rem"
              src={imageUrl}
              alt={explorerName}
              borderRadius="full"
            />
            <Text mt="0.5rem" textAlign={"center"}>
              {explorerName}
            </Text>
            <AvatarGroup size="2xs" spacing={"2px"} max={5}>
              {supportedChainIds
                // sort according to chain names instead of chainIds
                .sort((a, b) =>
                  chainIdToChain[a].name.localeCompare(chainIdToChain[b].name)
                )
                .map((chainId) => (
                  <Avatar
                    key={chainId}
                    src={chainIdToImage[chainId]}
                    name={chainIdToChain[chainId].name}
                    bg={"white"}
                  />
                ))}
            </AvatarGroup>
          </Center>
        </Link>
      )}
    </>
  );
};

export const ExplorerGridItem = ({
  explorerName,
  explorerData,
  explorerType,
  addressOrTx,
  toggleFavorite,
  isFavorite,
}: Params) => {
  return (
    <GridItem
      border="2px solid"
      borderColor={"gray.500"}
      bg={"white"}
      color={"black"}
      _hover={{
        cursor: "pointer",
        bgColor: "whiteAlpha.300",
        color: "white",
        borderColor: "gray.400",
      }}
      rounded="lg"
    >
      <CommonExplorerGridItem
        explorerName={explorerName}
        explorerData={explorerData}
        explorerType={explorerType}
        addressOrTx={addressOrTx}
        toggleFavorite={toggleFavorite}
        isFavorite={isFavorite}
      />
    </GridItem>
  );
};

interface FavoriteParams extends Params {
  index: number;
  handleDropHover: (i: number, j: number) => void;
}

export const FavoriteExplorerGridItem = ({
  explorerName,
  explorerData,
  explorerType,
  addressOrTx,
  toggleFavorite,
  index,
  handleDropHover,
}: FavoriteParams) => {
  const { ref, isDragging } = useFavExplorerDragNDrop<HTMLDivElement>({
    explorerName,
    index,
    handleDropHover,
  });

  return (
    <GridItem
      ref={ref}
      border="2px solid"
      borderColor={"gray.500"}
      bg={"white"}
      color={"black"}
      _hover={{
        cursor: "pointer",
        bgColor: "whiteAlpha.300",
        color: "white",
        borderColor: "gray.400",
      }}
      rounded="lg"
    >
      <CommonExplorerGridItem
        explorerName={explorerName}
        explorerData={explorerData}
        explorerType={explorerType}
        addressOrTx={addressOrTx}
        toggleFavorite={toggleFavorite}
        isFavorite={true}
      />
    </GridItem>
  );
};
