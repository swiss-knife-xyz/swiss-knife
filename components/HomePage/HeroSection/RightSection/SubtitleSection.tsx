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
      Swiss Knife provides a comprehensive suite of tools for Ethereum
      developers and users. From{" "}
      <HighlightedText href={`${getPath(subdomains.CALLDATA.base)}decoder`}>
        decoding calldata
      </HighlightedText>{" "}
      to{" "}
      <HighlightedText href={`${getPath(subdomains.TRANSACT.base)}`}>
        interacting with contracts
      </HighlightedText>
      ,{" "}
      <HighlightedText href={`${getPath(subdomains.CONVERTER.base)}`}>
        converting units
      </HighlightedText>
      , accessing frequently used{" "}
      <HighlightedText href={`${getPath(subdomains.CONSTANTS.base)}`}>
        constants
      </HighlightedText>{" "}
      and more - everything you need is just a click away ⚡
    </Text>
  );
};
