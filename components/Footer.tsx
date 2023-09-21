import {
  Box,
  Container,
  Stack,
  Text,
  Link,
  Center,
  HStack,
  Heading,
} from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTwitter } from "@fortawesome/free-brands-svg-icons";

export const Footer = () => {
  return (
    <Box
      mt="6rem"
      bg={"blackAlpha.500"}
      color={"gray.200"}
      borderTop={"solid"}
      borderTopWidth={1}
      borderColor={"custom.greenDarker"}
    >
      <Container as={Stack} maxW={"8xl"} py={10}>
        <Center flexDir={"column"}>
          <Heading size="md">
            Built by:{" "}
            <Link
              color={"twitter.300"}
              href="https://twitter.com/apoorvlathey"
              isExternal
            >
              <HStack>
                <FontAwesomeIcon icon={faTwitter} size="lg" />
                {"  "}
                <Text display="inline">@apoorvlathey</Text> <ExternalLinkIcon />
              </HStack>
            </Link>
          </Heading>
          <Heading mt="2rem" size="md" color="custom.greenLight">
            <Link href="https://apoorv.xyz/" isExternal>
              <Text display="inline">[apoorv.xyz]</Text>
            </Link>
          </Heading>
        </Center>
      </Container>
    </Box>
  );
};
