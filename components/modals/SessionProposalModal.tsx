import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  Avatar,
  Button,
  Box,
  Center,
  HStack,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Text,
} from "@chakra-ui/react";
import { useChainId, useAccount } from "wagmi";
import { buildApprovedNamespaces } from "@walletconnect/utils";
import { WalletKitTypes } from "@reown/walletkit";
import { useSnapshot } from "valtio";
import ModalStore from "@/store/ModalStore";
import { web3wallet } from "@/utils/WalletConnectUtil";
import SettingsStore from "@/store/SettingsStore";
import { EIP155_SIGNING_METHODS } from "@/data/EIP155Data";
import { walletChains } from "@/app/providers";

export const SessionProposalModal = () => {
  const { address } = useAccount();
  const chainId = useChainId();

  const data = useSnapshot(ModalStore.state);
  const proposal = data?.data?.proposal as WalletKitTypes.SessionProposal;

  const [isApproved, setIsApproved] = useState(false);
  const [isLoadingApprove, setIsLoadingApprove] = useState(false);
  const hasApproved = useRef(false);

  // only approve once (or else duplicate sessions created)
  useEffect(() => {
    // auto-approve proposal request when modal is loaded
    if (!hasApproved.current) {
      onApprove();
    }
  }, []);

  // Handle approve action, construct session namespace
  const onApprove = useCallback(async () => {
    // Prevent multiple executions
    if (isLoadingApprove || hasApproved.current) return;

    console.log({ onApprove: "onApprove", proposal });
    setIsApproved(true);
    hasApproved.current = true;

    if (proposal && chainId && address) {
      SettingsStore.setIsConnectLoading(false);
      setIsLoadingApprove(true);

      try {
        const namespaceKey = "eip155";
        const chain = `${namespaceKey}:${chainId}`;
        const account = `${chain}:${address}`;

        await web3wallet.approveSession({
          id: proposal.id,
          namespaces: buildApprovedNamespaces({
            proposal: proposal.params,
            supportedNamespaces: {
              [namespaceKey]: {
                chains: [chain],
                accounts: [account],
                methods: Object.values(EIP155_SIGNING_METHODS),
                events: [
                  "connect",
                  "disconnect",
                  "message",
                  "accountsChanged",
                  "chainChanged",
                ],
              },
            },
          }),
        });
        SettingsStore.setSessions(
          Object.values(web3wallet.getActiveSessions())
        );
      } catch (e) {
        setIsLoadingApprove(false);
        hasApproved.current = false;
        console.log((e as Error).message, "error");
        return;
      }

      setIsLoadingApprove(false);
      ModalStore.close();
    }
  }, [chainId, address, proposal, isLoadingApprove]);

  const { icons, name, url } = proposal.params.proposer.metadata;

  return (
    <ModalContent bg={"gray.900"}>
      <ModalHeader>Session Proposal</ModalHeader>
      <ModalCloseButton />
      <ModalBody>
        <Center>
          <Avatar src={icons[0]} mr="2rem" />
          <Box>
            <Text>{name}</Text>
            <Text color={"whiteAlpha.600"}>{url}</Text>
          </Box>
        </Center>
      </ModalBody>
      <ModalFooter>
        <HStack>
          <Button
            onClick={onApprove}
            isLoading={isLoadingApprove}
            isDisabled={hasApproved.current}
            colorScheme={"green"}
          >
            Approve
          </Button>
        </HStack>
      </ModalFooter>
    </ModalContent>
  );
};
