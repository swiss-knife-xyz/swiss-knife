import {
  Box,
  Container,
  Stack,
  Text,
  Link,
  Center,
  HStack,
  Heading,
  VStack,
} from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTwitter, faDiscord } from "@fortawesome/free-brands-svg-icons";

export const Footer = () => {
  return (
    <Box
      flexShrink={0}
      bg={"blackAlpha.500"}
      color={"gray.200"}
      borderTop={"solid"}
      borderTopWidth={1}
      borderColor={"custom.greenDarker"}
    >
      <Container as={Stack} maxW={"8xl"} py={10}>
        <HStack spacing={10} justify="center">
          <Center>
            <Heading size="md">
              <Link
                color={"white"}
                href="https://twitter.com/swissknifexyz"
                isExternal
              >
                <HStack spacing={2}>
                  <FontAwesomeIcon icon={faTwitter} size="lg" />
                  {/* {"  "} */}
                  <Text>@swissknifexyz</Text>
                  <ExternalLinkIcon />
                </HStack>
              </Link>
            </Heading>
          </Center>
          <Center>
            <Link href={"/discord"} color="twitter.200" isExternal>
              <FontAwesomeIcon icon={faDiscord} size="2x" />
            </Link>
          </Center>
        </HStack>
      </Container>
    </Box>
  );
};
