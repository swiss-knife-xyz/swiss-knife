import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Box,
  Image as ChakraImage,
  BoxProps,
  Center,
  Skeleton,
} from "@chakra-ui/react";

interface ResizableImageProps extends Omit<BoxProps, "width" | "height"> {
  src: string;
  maxInitialWidth?: number;
  maxInitialHeight?: number;
}

interface Size {
  width: number;
  height: number;
}

export const ResizableImage: React.FC<ResizableImageProps> = ({
  src,
  maxInitialWidth = 300,
  maxInitialHeight = 200,
  ...boxProps
}) => {
  const [size, setSize] = useState<Size>({
    width: maxInitialWidth,
    height: maxInitialHeight,
  });
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const aspectRatioRef = useRef<number>(1);

  const calculateAspectRatio = useCallback(
    (originalWidth: number, originalHeight: number) => {
      const aspectRatio = originalWidth / originalHeight;
      aspectRatioRef.current = aspectRatio;
      let newWidth = maxInitialWidth;
      let newHeight = maxInitialWidth / aspectRatio;

      if (newHeight > maxInitialHeight) {
        newHeight = maxInitialHeight;
        newWidth = maxInitialHeight * aspectRatio;
      }

      return { width: newWidth, height: newHeight };
    },
    [maxInitialWidth, maxInitialHeight]
  );

  const handleImageLoad = useCallback(
    (event: Event) => {
      const img = event.target as HTMLImageElement;
      if (img) {
        const { naturalWidth, naturalHeight } = img;
        const newSize = calculateAspectRatio(naturalWidth, naturalHeight);
        setSize(newSize);
        setImageLoaded(true);
      }
    },
    [calculateAspectRatio]
  );

  useEffect(() => {
    const img = document.createElement("img");
    img.src = src;
    img.onload = handleImageLoad;
  }, [src, handleImageLoad]);

  const startResize = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResize = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (isResizing && containerRef.current) {
        const { clientX, clientY } = "touches" in e ? e.touches[0] : e;
        const { left, top } = containerRef.current.getBoundingClientRect();
        const newWidth = Math.max(100, clientX - left);
        const newHeight = newWidth / aspectRatioRef.current;

        setSize({
          width: newWidth,
          height: newHeight,
        });
      }
    },
    [isResizing]
  );

  useEffect(() => {
    document.addEventListener("mousemove", resize);
    document.addEventListener("mouseup", stopResize);
    document.addEventListener("touchmove", resize);
    document.addEventListener("touchend", stopResize);

    return () => {
      document.removeEventListener("mousemove", resize);
      document.removeEventListener("mouseup", stopResize);
      document.removeEventListener("touchmove", resize);
      document.removeEventListener("touchend", stopResize);
    };
  }, [resize, stopResize]);

  return (
    <Center flexDir="column">
      <Box
        ref={containerRef}
        position="relative"
        display="inline-block"
        width={`${size.width}px`}
        height={`${size.height}px`}
        {...boxProps}
      >
        <Skeleton isLoaded={imageLoaded} width="100%" height="100%">
          <ChakraImage
            ref={imageRef}
            src={src}
            objectFit="cover"
            width="100%"
            height="100%"
            style={{ opacity: imageLoaded ? 1 : 0 }}
            transition="opacity 0.3s ease-in-out"
          />
        </Skeleton>
        {imageLoaded && (
          <Box
            position="absolute"
            bottom="0"
            right="0"
            width="20px"
            height="20px"
            cursor="se-resize"
            onMouseDown={startResize}
            onTouchStart={startResize}
          />
        )}
      </Box>
      <Box mt={2} fontSize="sm" color="whiteAlpha.800">
        *resizeable image*
      </Box>
    </Center>
  );
};
