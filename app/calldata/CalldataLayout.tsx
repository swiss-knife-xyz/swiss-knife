// creating separate component here, so that we can keep "use client" here and not in the actual layout to enable setting metadata
"use client";

import { Box, HStack, Link, Text } from "@chakra-ui/react";
import { Layout } from "@/components/Layout";
import subdomains from "@/subdomains";
import { getPath } from "@/utils";
import { usePathname } from "next/navigation";

const CalldataTools = [
  { name: "Decoder", path: "decoder" },
  { name: "Encoder", path: "encoder" },
  { name: "Transaction Tracer", path: "trace" },
  { name: "Viem Error Simulate", path: "viem-error-simulate" },
  { name: "CoWSwap TWAP Verifier", path: "cowswap" },
];

export const CalldataLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();

  return (
    <Layout
      mt={0}
      maxW="1760px"
      minW={0}
      allowSticky={pathname.endsWith("/decoder") || pathname.endsWith("/trace")}
      beforeFooterSlot={pathname.endsWith("/decoder")}
    >
      <Box w="full" minW={0}>
        {/* Secondary tool navigation: one compact row at every viewport.
            Scrolls horizontally inside itself on narrow screens. */}
        <Box
          as="nav"
          aria-label="Calldata tools"
          w="full"
          minW={0}
          overflowX="auto"
          overflowY="hidden"
          sx={{
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }}
          borderBottom="1px solid"
          borderColor="whiteAlpha.100"
        >
          <HStack spacing={5} h="40px" alignItems="stretch" w="max-content">
            <Text
              display="flex"
              alignItems="center"
              fontSize="sm"
              fontWeight="medium"
              color="text.secondary"
              whiteSpace="nowrap"
              pr={2}
            >
              Calldata tools:
            </Text>
            {CalldataTools.map((item) => {
              const isActive = pathname.endsWith(`/${item.path}`);
              return (
                <Link
                  key={item.path}
                  href={`${getPath(subdomains.CALLDATA.base)}${item.path}`}
                  aria-current={isActive ? "page" : undefined}
                  display="flex"
                  alignItems="center"
                  px={1}
                  fontSize="sm"
                  fontWeight={isActive ? "medium" : "normal"}
                  whiteSpace="nowrap"
                  color={isActive ? "text.primary" : "text.secondary"}
                  borderBottom="2px solid"
                  borderColor={isActive ? "primary.500" : "transparent"}
                  transition="color 0.15s, border-color 0.15s"
                  _hover={{ color: "text.primary", textDecoration: "none" }}
                  _focusVisible={{
                    outline: "none",
                    boxShadow: "inset 0 0 0 2px rgba(59,130,246,0.6)",
                    borderRadius: "sm",
                  }}
                >
                  {item.name}
                </Link>
              );
            })}
          </HStack>
        </Box>
        <Box w="full" minW={0} pt={6}>
          {children}
        </Box>
      </Box>
    </Layout>
  );
};
