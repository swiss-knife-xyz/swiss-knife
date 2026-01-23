import { Text, Link, Flex } from "@chakra-ui/react";
import { CopyToClipboard } from "./CopyToClipboard";
import { shortenAddress } from "@/utils/helpers";

type AddressDisplayProps = {
  address: string | undefined;
  fullAddress?: string;
  showExplorerLink?: boolean;
  explorerUrl?: string;
};

export default function AddressDisplay({
  address,
  fullAddress,
  showExplorerLink,
  explorerUrl,
}: AddressDisplayProps) {
  const textToActuallyCopy = fullAddress || address || "";
  const displayAddress = shortenAddress(address);

  if (!address)
    return (
      <Text as="span" color="gray.500">
        N/A
      </Text>
    );

  return (
    <Flex alignItems="center">
      {showExplorerLink && explorerUrl ? (
        <Link href={explorerUrl} isExternal>
          <Text
            as="span"
            fontFamily="monospace"
            fontSize="md"
            color="gray.100"
            mr={1}
            _hover={{ textDecoration: "underline" }}
          >
            {displayAddress}
          </Text>
        </Link>
      ) : (
        <Text
          as="span"
          fontFamily="monospace"
          fontSize="md"
          color="gray.100"
          mr={1}
        >
          {displayAddress}
        </Text>
      )}
      {address && (
        <CopyToClipboard
          textToCopy={textToActuallyCopy}
          size="xs"
          variant="ghost"
          color="gray.400"
          _hover={{ color: "gray.100", bg: "whiteAlpha.200" }}
          aria-label="Copy address"
          title="Copy full address"
        />
      )}
    </Flex>
  );
}
