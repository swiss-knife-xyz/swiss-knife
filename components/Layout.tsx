"use client";

import { ReactNode, useState } from "react";
import { Box, Container, Flex, HStack, FlexProps } from "@chakra-ui/react";
import { useLocalStorage } from "usehooks-ts";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BeforeFooterSlotContext } from "@/components/BeforeFooterSlot";

interface LayoutParams extends FlexProps {
  children: ReactNode;
  /**
   * Opt out of the default ancestor `overflow: hidden | auto` wrappers so
   * descendants can use `position: sticky`. Use when the page has no wide
   * content that needs horizontal scrolling.
   */
  allowSticky?: boolean;
  /**
   * Render an empty, page-width row immediately above the footer that pages
   * can portal into via `useBeforeFooterSlot`. Off by default.
   */
  beforeFooterSlot?: boolean;
}

export const Layout = ({
  children,
  allowSticky,
  beforeFooterSlot,
  ...props
}: LayoutParams) => {
  const [slotElement, setSlotElement] = useState<HTMLElement | null>(null);
  const [isNavExpanded, setIsNavExpanded] = useLocalStorage(
    "isNavExpanded",
    false
  );

  const toggleNav = () => {
    setIsNavExpanded(!isNavExpanded);
  };

  const wrapperOverflow = allowSticky ? "visible" : "hidden";
  const innerOverflowX = allowSticky ? "visible" : "auto";

  return (
    <Box display="flex" flexDir="column" minHeight="100vh" bg="bg.base">
      <Box flexGrow={1} overflow={wrapperOverflow}>
        <HStack alignItems="flex-start" spacing={0}>
          <Flex
            flexDir="column"
            flexGrow={1}
            minW={0}
            overflow={wrapperOverflow}
          >
            <Navbar />
            <Box overflowX={innerOverflowX} flexGrow={1} minW={0}>
              <Container
                mt={8}
                minW={allowSticky ? undefined : "max-content"}
                px={{ base: 4, md: 6 }}
                maxW="container.xl"
                {...props}
              >
                <BeforeFooterSlotContext.Provider
                  value={beforeFooterSlot ? slotElement : null}
                >
                  {children}
                </BeforeFooterSlotContext.Provider>
              </Container>
            </Box>
          </Flex>
        </HStack>
      </Box>
      {beforeFooterSlot && (
        <Container
          px={{ base: 4, md: 6 }}
          maxW={props.maxW ?? "container.xl"}
          w="full"
        >
          <Box
            ref={setSlotElement}
            data-testid="layout-before-footer"
            py={4}
            minW={0}
          />
        </Container>
      )}
      <Footer />
    </Box>
  );
};
