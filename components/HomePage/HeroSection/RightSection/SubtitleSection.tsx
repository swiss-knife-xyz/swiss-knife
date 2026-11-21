import { Text } from "@chakra-ui/react";
import { HighlightedText } from "./HighlightedText";
import { getPath } from "@/utils";
import subdomains from "@/subdomains";

export const SubtitleSection = () => {
  return (
    <Text
      fontSize={{ base: "lg", md: "xl" }}
      color="gray.300"
      mb={{ base: 6, md: 8 }}
      maxW="600px"
      textAlign={{ base: "center", md: "justify" }}
    >
      ETH.sh provides a comprehensive suite of tools for Ethereum developers and
      users. From{" "}
      <HighlightedText href={`${getPath(subdomains.CALLDATA.base)}decoder`}>
        decoding calldata
      </HighlightedText>{" "}
      to{" "}
      <HighlightedText href={getPath(subdomains.CONTRACT.base)}>
        interacting with contracts
      </HighlightedText>
      ,{" "}
      <HighlightedText href={getPath(subdomains.STORAGE_SLOTS.base)}>
        inspecting storage slots
      </HighlightedText>
      ,{" "}
      <HighlightedText href={getPath(subdomains.CONTRACT_DIFF.base)}>
        comparing source codes
      </HighlightedText>{" "}
      and more - everything you need is just a click away ⚡
    </Text>
  );
};
