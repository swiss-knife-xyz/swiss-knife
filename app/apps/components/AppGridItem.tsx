import React from "react";
import { GridItem, Box, VStack, Text, Button, HStack } from "@chakra-ui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart } from "@fortawesome/free-solid-svg-icons";
import Image from "next/image";
import { useFavAppDragNDrop } from "@/hooks/useFavAppDragNDrop";
import { SafeDappInfo } from "@/types/safeDapps";

interface CommonParams {
  dapp: SafeDappInfo;
  toggleFavorite: (dappName: string) => void;
  onDappClick: (url: string) => void;
  isFavorite?: boolean;
}

const CommonAppGridItem = ({
  dapp,
  toggleFavorite,
  onDappClick,
  isFavorite,
}: CommonParams) => {
  return (
    <>
      <HStack position="absolute" top={2} right={2}>
        <Button
          size="sm"
          variant="ghost"
          color={isFavorite ? "orange.300" : "whiteAlpha.600"}
          _hover={{
            color: isFavorite ? "orange.200" : "white",
            bg: "whiteAlpha.100",
          }}
          title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(dapp.name);
          }}
        >
          <FontAwesomeIcon icon={faHeart} />
        </Button>
      </HStack>
      <VStack
        spacing={3}
        align="center"
        onClick={() => onDappClick(dapp.url)}
        pt={6}
      >
        <Box w="60px" h="60px" borderRadius="full" overflow="hidden" bg="white">
          <Image
            src={dapp.iconUrl}
            alt={dapp.name}
            width={60}
            height={60}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </Box>
        <Text color="white" fontWeight="bold" fontSize="lg" textAlign="center">
          {dapp.name}
        </Text>
        {dapp.description && (
          <Text
            color="whiteAlpha.700"
            fontSize="sm"
            textAlign="center"
            noOfLines={2}
          >
            {dapp.description}
          </Text>
        )}
      </VStack>
    </>
  );
};

export const AppGridItem = ({
  dapp,
  toggleFavorite,
  onDappClick,
  isFavorite,
}: CommonParams) => {
  return (
    <GridItem
      position="relative"
      p={4}
      borderWidth={1}
      borderRadius="lg"
      borderColor="whiteAlpha.300"
      bg="whiteAlpha.100"
      _hover={{
        bg: "whiteAlpha.200",
        transform: "scale(1.02)",
        cursor: "pointer",
        "& > button": {
          opacity: 1,
        },
      }}
      transition="all 0.2s"
    >
      <CommonAppGridItem
        dapp={dapp}
        toggleFavorite={toggleFavorite}
        onDappClick={onDappClick}
        isFavorite={isFavorite}
      />
    </GridItem>
  );
};

interface FavoriteParams extends CommonParams {
  index: number;
  handleDropHover: (i: number, j: number) => void;
}

export const FavoriteAppGridItem = ({
  dapp,
  toggleFavorite,
  onDappClick,
  index,
  handleDropHover,
}: FavoriteParams) => {
  const { ref, isDragging } = useFavAppDragNDrop<HTMLDivElement>({
    appName: dapp.name,
    index,
    handleDropHover,
  });

  return (
    <GridItem
      ref={ref}
      position="relative"
      p={4}
      borderWidth={1}
      borderRadius="lg"
      borderColor="whiteAlpha.300"
      bg="whiteAlpha.100"
      _hover={{
        bg: "whiteAlpha.200",
        transform: "scale(1.02)",
        cursor: "pointer",
      }}
      transition="all 0.2s"
      opacity={isDragging ? 0.5 : 1}
    >
      <CommonAppGridItem
        dapp={dapp}
        toggleFavorite={toggleFavorite}
        onDappClick={onDappClick}
        isFavorite={true}
      />
    </GridItem>
  );
};
