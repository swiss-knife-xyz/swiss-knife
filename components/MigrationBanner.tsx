"use client";

import { Box, CloseButton, Flex, Image, Text } from "@chakra-ui/react";
import { usePathname } from "next/navigation";
import { parseAsString, useQueryState } from "nuqs";

/** Reserved legacy redirect marker: ?migration=swiss-knife. */
export function MigrationBanner() {
  const pathname = usePathname();
  const [migration, setMigration] = useQueryState(
    "migration",
    parseAsString.withOptions({
      history: "replace",
      shallow: true,
      scroll: false,
    })
  );

  if (migration !== "swiss-knife" || pathname === "/_storage") return null;

  return (
    <Box
      as="aside"
      aria-label="Swiss Knife migration announcement"
      bg="bg.muted"
      bgImage="radial-gradient(ellipse 420px 90px at max(140px, calc((100% - 1280px) / 2 + 160px)) 115%, rgba(232, 94, 65, 0.13) 0%, rgba(232, 94, 65, 0.04) 50%, transparent 100%)"
      borderBottom="1px solid"
      borderColor="border.default"
      color="text.primary"
      px={{ base: 4, md: 6 }}
      py={3}
    >
      <Flex maxW="container.xl" mx="auto" align="center" gap={3}>
        <Image src="/favicon.svg" alt="" boxSize={8} flexShrink={0} />
        <Box flex={1} minW={0} role="status">
          <Text fontSize="sm" fontWeight="semibold">
            Swiss-Knife.xyz is now ETH.sh
          </Text>
          <Text fontSize="xs" color="text.secondary" mt={0.5}>
            Your Ethereum toolkit has a new home. Bookmark this address for next
            time.
          </Text>
        </Box>
        <CloseButton
          aria-label="Dismiss migration banner"
          size="sm"
          flexShrink={0}
          onClick={() => void setMigration(null)}
          _hover={{ bg: "whiteAlpha.100" }}
          _focusVisible={{ outline: "2px solid", outlineColor: "primary.400" }}
        />
      </Flex>
    </Box>
  );
}
