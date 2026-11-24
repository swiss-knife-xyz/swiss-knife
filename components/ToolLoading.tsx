import Link from "next/link";
import { Box, Heading, Text } from "@chakra-ui/react";
import { getPath } from "@/utils";

/** Public tool identity remains readable while query-dependent UI hydrates. */
export function ToolLoading({ title, description }: { title: string; description: string }) {
  return (
    <Box p={8} textAlign="center" aria-busy="true">
      <Heading as="h1" size="xl" color="text.primary" mb={4}>{title}</Heading>
      <Text color="text.secondary" mb={4}>{description}</Text>
      <Text color="text.tertiary" mb={4} role="status">Loading interactive tool…</Text>
      <Link href={getPath("")}>Browse all Ethereum tools</Link>
    </Box>
  );
}
