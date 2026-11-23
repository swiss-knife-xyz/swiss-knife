import { IPFS_GATEWAY_TIMEOUT_MS } from "@/lib/ipfs";
import { useEffect, useState } from "react";
import { Box, Image, Skeleton, Text, type BoxProps } from "@chakra-ui/react";

interface ResizableImageProps extends Omit<BoxProps, "width" | "height"> {
  src: string;
  fallbackSrcs?: string[];
  onSourceLoad?: (src: string) => void;
  maxInitialWidth?: number;
  maxInitialHeight?: number;
}

// Native resizing stays bounded by the containing parameter column.
export const ResizableImage = (props: ResizableImageProps) => (
  <ResizableImageContent key={props.src} {...props} />
);

const ResizableImageContent = ({
  src,
  fallbackSrcs = [],
  onSourceLoad,
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
  const [sourceIndex, setSourceIndex] = useState(0);
  const activeSrc = [src, ...fallbackSrcs][sourceIndex];
  const hasFallbacks = fallbackSrcs.length > 0;
  const advance = () => {
    if (sourceIndex < fallbackSrcs.length) {
      setLoaded(false);
      setSourceIndex(sourceIndex + 1);
    } else {
      setFailed(true);
      setLoaded(true);
    }
  };
  useEffect(() => {
    if (!hasFallbacks || loaded || failed) return;
    const timer = window.setTimeout(() => {
      if (sourceIndex < fallbackSrcs.length) setSourceIndex(sourceIndex + 1);
      else {
        setFailed(true);
        setLoaded(true);
      }
    }, IPFS_GATEWAY_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [
    activeSrc,
    sourceIndex,
    fallbackSrcs.length,
    hasFallbacks,
    loaded,
    failed,
  ]);
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
            key={activeSrc}
            src={activeSrc}
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
              onSourceLoad?.(activeSrc);
            }}
            onError={advance}
          />
        </Skeleton>
      )}
    </Box>
  );
};
