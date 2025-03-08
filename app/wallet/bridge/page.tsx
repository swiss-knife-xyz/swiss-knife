"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import {
  CloseButton,
  Container,
  Flex,
  Heading,
  HStack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Image,
  Text,
  Box,
  Spinner,
  Center,
} from "@chakra-ui/react";
import { useChainId, useAccount } from "wagmi";
import { ConnectButton } from "@/components/ConnectButton";

import { useSnapshot } from "valtio";
import { RELAYER_EVENTS } from "@walletconnect/core";
import { getSdkError } from "@walletconnect/utils";
import { SessionTypes } from "@walletconnect/types";
import SettingsStore from "@/store/SettingsStore";
import {
  createWeb3Wallet,
  web3wallet,
  updateSignClientChainId,
} from "@/utils/WalletConnectUtil";
import { WalletConnect } from "@/components/WalletConnect";
import { Modal } from "@/components/modals/Modal";

const SessionTab = ({
  session,
}: {
  session: Readonly<
    Omit<SessionTypes.Struct, "namespaces" | "requiredNamespaces"> & {
      namespaces: {
        [key: string]: {
          chains?: readonly string[];
          accounts: readonly string[];
          methods: readonly string[];
          events: readonly string[];
        };
      };
      requiredNamespaces: {
        [key: string]: {
          chains?: readonly string[];
          methods: readonly string[];
          events: readonly string[];
        };
      };
    }
  >;
}) => {
  return (
    <Tab>
      <HStack>
        <Image
          w="1.4rem"
          src={session.peer.metadata.icons[0]}
          alt={session.peer.metadata.name + " logo"}
        />
        <Text>{session.peer.metadata.name}</Text>
        <CloseButton
          size="sm"
          onClick={async (e) => {
            e.preventDefault();
            await web3wallet.disconnectSession({
              topic: session.topic,
              reason: getSdkError("USER_DISCONNECTED"),
            });
            SettingsStore.setSessions(
              Object.values(web3wallet.getActiveSessions())
            );
          }}
        />
      </HStack>
    </Tab>
  );
};

const WalletBridge = () => {
  const { address } = useAccount();
  const chainId = useChainId();

  const { sessions, initialized } = useSnapshot(SettingsStore.state);
  const initializationAttempted = useRef(false);

  const [initSessionsLoaded, setInitSessionsLoaded] = useState(false);
  const [selectedTabIndex, setSelectedTabIndex] = useState(1);

  const onInitialize = useCallback(async () => {
    try {
      await createWeb3Wallet();
      SettingsStore.setInitialized(true);
    } catch (err: unknown) {
      console.error("Initialization failed", err);
      alert(err);
    }
  }, []);

  useEffect(() => {
    if (!initialized && !initializationAttempted.current) {
      console.log("initializing");
      initializationAttempted.current = true;
      onInitialize();
    }
  }, [initialized, onInitialize]);

  useEffect(() => {
    if (!initialized) return;
    web3wallet.core.relayer.on(RELAYER_EVENTS.connect, () => {
      console.log("Network connection is restored!", "success");
    });

    web3wallet.core.relayer.on(RELAYER_EVENTS.disconnect, () => {
      console.log("Network connection lost.", "error");
    });

    SettingsStore.setSessions(Object.values(web3wallet.getActiveSessions()));
  }, [initialized]);

  useEffect(() => {
    // when initial sessions loaded or loading, keep the tab on the new session
    if (!initSessionsLoaded && initialized) {
      setInitSessionsLoaded(true);
      setSelectedTabIndex(sessions.length);
    }
  }, [sessions, initSessionsLoaded, initialized]);

  useEffect(() => {
    if (chainId && address && initialized) {
      updateSignClientChainId(`eip155:${chainId}`, address);
    }
  }, [chainId, address, initialized]);

  return (
    <Flex flexDir={"column"} alignItems={"center"} w="100%">
      <Heading size="lg">Wallet Bridge</Heading>
      <Box mt={4}>
        <ConnectButton />
      </Box>
      <Container mt="8" mb="16" minW={["0", "0", "2xl", "2xl"]}>
        <Tabs index={selectedTabIndex} onChange={setSelectedTabIndex}>
          <TabList>
            {sessions.map((session, i) => (
              <SessionTab
                key={i}
                session={
                  session as Readonly<
                    Omit<
                      SessionTypes.Struct,
                      "namespaces" | "requiredNamespaces"
                    > & {
                      namespaces: {
                        [key: string]: {
                          chains?: readonly string[];
                          accounts: readonly string[];
                          methods: readonly string[];
                          events: readonly string[];
                        };
                      };
                      requiredNamespaces: {
                        [key: string]: {
                          chains?: readonly string[];
                          methods: readonly string[];
                          events: readonly string[];
                        };
                      };
                    }
                  >
                }
              />
            ))}
            {!initialized && (
              <Tab>
                <Spinner />
              </Tab>
            )}
            <Tab>+ New Session</Tab>
          </TabList>
          <TabPanels>
            {!initialized && (
              <TabPanel>
                <Box p={4}>Loading past sessions...</Box>
              </TabPanel>
            )}
            {sessions.map((session, i) => {
              return (
                <TabPanel key={i}>
                  <Box>{session.peer.metadata.name}</Box>

                  <Center mt="3rem">✅ Connected</Center>
                </TabPanel>
              );
            })}
            <TabPanel p={0}>
              <Box p={4}>
                <Box>New Session</Box>

                <WalletConnect />
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Container>
      <Modal />
    </Flex>
  );
};

export default WalletBridge;
