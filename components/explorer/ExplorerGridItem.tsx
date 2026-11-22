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
  Icon,
  Tooltip,
} from "@chakra-ui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FiCode } from "react-icons/fi";
import { faHeart } from "@fortawesome/free-solid-svg-icons";

import { ExplorerData, ExplorerType } from "@/types";
import { checkDifferentUrlsExist, generateUrl } from "@/utils";
import { ExplorerChainModal } from "./ExplorerChainModal";
import { chainIdToChain, chainIdToImage } from "@/data/common";
import { useFavExplorerDragNDrop } from "@/hooks/useFavExplorerDragNDrop";

interface Params {
  explorerName: string;
  explorerData: ExplorerData | undefined;
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

  // Providers can disappear after a directory refresh or from saved favorites.
  if (!explorerData) return null;

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
          type="button"
          size="xs"
          minW={8}
          h={8}
          p={0}
          position="relative"
          zIndex={1}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={Boolean(isFavorite)}
          color={isFavorite ? "orange.300" : "text.tertiary"}
          bg="transparent"
          roundedTopRight={0}
          roundedBottomLeft={0}
          _hover={{
            color: "orange.300",
            bg: "whiteAlpha.100",
          }}
          title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            toggleFavorite(explorerName);
          }}
        >
          <FontAwesomeIcon icon={faHeart} />
        </Button>
        {explorerData.forContracts ? (
          <>
            <Spacer />
            <Tooltip label="For contracts" hasArrow>
              <Icon as={FiCode} boxSize={4} color="text.secondary" role="img" aria-label="For contracts" tabIndex={0} mr={2} />
            </Tooltip>
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
              boxSize={8}
              objectFit="contain"
              flexShrink={0}
              fallback={<Center boxSize={8} rounded="full" bg="bg.muted" color="text.secondary" fontSize="sm">{explorerName[0]}</Center>}
              src={imageUrl}
              alt={explorerName}
              borderRadius="full"
            />
            <Text mt="0.5rem" textAlign="center" overflowWrap="anywhere">
              {explorerName}
            </Text>
            <AvatarGroup size="2xs" spacing="2px" max={5} sx={{ "& .chakra-avatar__excess": { color: "white", bg: "whiteAlpha.200" } }}>
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
              bg={explorerData.faviconWhite ? "gray.800" : "white"}
              boxSize={8}
              objectFit="contain"
              flexShrink={0}
              fallback={<Center boxSize={8} rounded="full" bg="bg.muted" color="text.secondary" fontSize="sm">{explorerName[0]}</Center>}
              src={imageUrl}
              alt={explorerName}
              borderRadius="full"
            />
            <Text mt="0.5rem" textAlign="center" overflowWrap="anywhere">
              {explorerName}
            </Text>
            <AvatarGroup size="2xs" spacing="2px" max={5} sx={{ "& .chakra-avatar__excess": { color: "white", bg: "whiteAlpha.200" } }}>
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
      minW={0}
      border="1px solid"
      borderColor="border.default"
      bg="bg.subtle"
      color="text.primary"
      _hover={{
        cursor: "pointer",
        bg: "bg.muted",
        borderColor: "border.strong",
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
      minW={0}
      ref={ref}
      border="1px solid"
      borderColor="border.default"
      bg="bg.subtle"
      color="text.primary"
      _hover={{
        cursor: "pointer",
        bg: "bg.muted",
        borderColor: "border.strong",
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
