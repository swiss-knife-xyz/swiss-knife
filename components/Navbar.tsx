import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Center,
  Spacer,
  Heading,
  HStack,
  Text,
  Image,
  Flex,
  Link as ChakraLink,
  Alert,
  VStack,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
} from "@chakra-ui/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { baseURL } from "@/config";
import { ILeaderboard } from "@/types";
import { slicedText } from "@/utils";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { DarkButton } from "./DarkButton";

export const Navbar = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [leaderboard, setLeaderboard] = useState<ILeaderboard | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_DEVELOPMENT === "true"
            ? ""
            : "https://swiss-knife.xyz"
        }/api/leaderboard`
      );
      const data = await response.json();
      console.log({ data });
      setLeaderboard(data);
    };
    fetchLeaderboard();
  }, []);

  return (
    <VStack w="100%">
      <Flex w="100%">
        <Spacer flex="1" />
        <Center pt={"10"}>
          <Heading color="custom.pale" pl="1rem">
            <Link href={baseURL}>
              <HStack spacing={"4"}>
                <Image w="3rem" alt="icon" src="/icon.png" rounded={"lg"} />
                <Text>Swiss Knife</Text>
              </HStack>
            </Link>
          </Heading>
        </Center>
        <Flex flex="1" justifyContent="flex-end" pr="1rem" pt="1rem">
          <ChakraLink
            href={"https://github.com/swiss-knife-xyz/swiss-knife"}
            isExternal
          >
            <FontAwesomeIcon icon={faGithub} size="2x" />
          </ChakraLink>
        </Flex>
      </Flex>
      {leaderboard && (
        <Alert status="info" bg={"#151515"}>
          <Center w="100%">
            <VStack>
              <HStack>
                <Text>🏆 Current Top donor: </Text>

                <ChakraLink
                  href={`https://arbiscan.io/address/${leaderboard.topDonorsWithEns[0].address}`}
                  isExternal
                >
                  <HStack>
                    <Text color="whiteAlpha.800">
                      {leaderboard.topDonorsWithEns[0].ens.length > 0
                        ? leaderboard.topDonorsWithEns[0].ens
                        : slicedText(leaderboard.topDonorsWithEns[0].address)}
                    </Text>
                    <ExternalLinkIcon />
                  </HStack>
                </ChakraLink>
              </HStack>
              <DarkButton onClick={onOpen}>View Leaderboard 🏆</DarkButton>
            </VStack>
          </Center>
          <Modal isOpen={isOpen} onClose={() => onClose()} isCentered>
            <ModalOverlay bg="none" backdropFilter="auto" backdropBlur="5px" />
            <ModalContent
              minW={{
                base: 0,
                sm: "30rem",
                md: "40rem",
              }}
              pb="6"
              bg="bg.900"
            >
              <ModalHeader>Gitcoin Donors Leaderboard</ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <HStack>
                  <Text>Donate on Gitcoin:</Text>
                  <ChakraLink
                    href="https://explorer.gitcoin.co/#/round/42161/27/33"
                    isExternal
                  >
                    <HStack color="blue.200">
                      <Text>Here</Text>
                      <ExternalLinkIcon />
                    </HStack>
                  </ChakraLink>
                </HStack>
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Rank</Th>
                      <Th>
                        <Center>Donor</Center>
                      </Th>
                      <Th>Amount</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {leaderboard.topDonorsWithEns.map((donor, index) => (
                      <Tr
                        key={index}
                        bg={
                          index === 0
                            ? "#EFCA1A" // gold
                            : index === 1
                            ? "#B4B4B4" // silver
                            : index === 2
                            ? "#BB7C3D" // bronze
                            : ""
                        }
                      >
                        <Td>{index + 1}</Td>
                        <Td>
                          <ChakraLink
                            href={`https://arbiscan.io/address/${donor.address}`}
                            isExternal
                          >
                            <Center>
                              <HStack>
                                <Text>
                                  {donor.ens.length > 0
                                    ? donor.ens
                                    : slicedText(donor.address)}
                                </Text>
                                <ExternalLinkIcon />
                              </HStack>
                            </Center>
                          </ChakraLink>
                        </Td>
                        <Td>${donor.usdAmount}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </ModalBody>
            </ModalContent>
          </Modal>
        </Alert>
      )}
    </VStack>
  );
};
