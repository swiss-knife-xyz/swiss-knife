import { useState } from "react";
import { Box, Image, Skeleton, Text, type BoxProps } from "@chakra-ui/react";

interface ResizableImageProps extends Omit<BoxProps, "width" | "height"> {
  src: string;
  maxInitialWidth?: number;
  maxInitialHeight?: number;
}

// Native resizing stays bounded by the containing parameter column.
export const ResizableImage = ({
  src,
  maxInitialWidth = 300,
  maxInitialHeight = 200,
  ...boxProps
}: ResizableImageProps) => {
  const [size, setSize] = useState({
    width: maxInitialWidth,
    height: maxInitialHeight,
  });
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <Box
      position="relative"
      w={`${size.width}px`}
      h={`${size.height}px`}
      maxW="100%"
      minW="80px"
      minH="80px"
      resize="both"
      overflow="hidden"
      borderRadius="4px"
      bg="bg.muted"
      title="Drag the corner to resize"
      {...boxProps}
    >
      {failed ? (
        <Text p={3} color="text.tertiary" fontSize="xs">
          Image unavailable
        </Text>
      ) : (
        <Skeleton
          isLoaded={loaded}
          w="full"
          h="full"
          startColor="whiteAlpha.50"
          endColor="whiteAlpha.100"
        >
          <Image
            src={src}
            alt="Image preview"
            w="full"
            h="full"
            objectFit="contain"
            draggable={false}
            onLoad={(event) => {
              const image = event.currentTarget;
              const ratio = image.naturalWidth / image.naturalHeight || 1;
              const width = Math.min(maxInitialWidth, maxInitialHeight * ratio);
              setSize({ width, height: width / ratio });
              setLoaded(true);
            }}
            onError={() => {
              setFailed(true);
              setLoaded(true);
            }}
          />
        </Skeleton>
      )}
    </Box>
  );
};
