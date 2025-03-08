import { useEffect, useState } from "react";
import {
  Button,
  Input,
  FormControl,
  FormLabel,
  Center,
  useToast,
  Spinner,
} from "@chakra-ui/react";
import { useSwitchChain } from "wagmi";
import ModalStore from "@/store/ModalStore";
import { WalletKitTypes } from "@reown/walletkit";
import { parseUri } from "@walletconnect/utils";
import { web3wallet } from "@/utils/WalletConnectUtil";
import { useSnapshot } from "valtio";
import SettingsStore from "@/store/SettingsStore";
import { EIP155_SIGNING_METHODS } from "@/data/EIP155Data";
import { Hex } from "viem";
import { approveEIP155Request } from "@/utils/EIP155RequestHandlerUtil";

export const WalletConnect = () => {
  const toast = useToast();
  const { switchChainAsync } = useSwitchChain();

  const { isConnectLoading, initialized, isEventsInitialized } = useSnapshot(
    SettingsStore.state
  );

  const [uri, setUri] = useState("");
  const [pasted, setPasted] = useState(false);

  async function onConnect() {
    SettingsStore.setIsConnectLoading(true);

    const { topic: pairingTopic } = parseUri(uri);
    // if for some reason, the proposal is not received, we need to close the modal when the pairing expires (5mins)
    const pairingExpiredListener = ({ topic }: { topic: string }) => {
      if (pairingTopic === topic) {
        console.log(
          "Pairing expired. Please try again with new Connection URI",
          "error"
        );
        ModalStore.close();
        web3wallet.core.pairing.events.removeListener(
          "pairing_expire",
          pairingExpiredListener
        );
      }
    };

    /// === SETUP EVENTS ===
    /******************************************************************************
     * 1. Open session proposal modal for confirmation / rejection
     *****************************************************************************/
    if (!isEventsInitialized) {
      SettingsStore.setIsEventsInitialized(true);

      web3wallet.on(
        "session_proposal",
        (proposal: WalletKitTypes.SessionProposal) => {
          console.log("session_proposal", proposal);
          // set the verify context so it can be displayed in the projectInfoCard
          SettingsStore.setCurrentRequestVerifyContext(proposal.verifyContext);
          ModalStore.open("SessionProposalModal", { proposal });

          web3wallet.core.pairing.events.removeListener(
            "pairing_expire",
            pairingExpiredListener
          );
        }
      );
      web3wallet.on(
        "session_request",
        async (requestEvent: WalletKitTypes.SessionRequest) => {
          console.log("session_request", requestEvent);
          const { topic, params, verifyContext } = requestEvent;
          const { request } = params;
          const requestSession =
            web3wallet.engine.signClient.session.get(topic);
          // set the verify context so it can be displayed in the projectInfoCard
          SettingsStore.setCurrentRequestVerifyContext(verifyContext);

          switch (request.method) {
            // case EIP155_SIGNING_METHODS.WALLET_SWITCH_ETHEREUM_CHAIN:
            // case EIP155_SIGNING_METHODS.WALLET_ADD_ETHEREUM_CHAIN: {
            //   const { chainId }: { chainId: Hex } = request.params[0];
            //   await switchChainAsync({ chainId: Number(BigInt(chainId)) });
            //   await web3wallet.respondSessionRequest({
            //     topic,
            //     response: await approveEIP155Request({
            //       requestEvent,
            //     }),
            //   });
            //   break;
            // }
            case EIP155_SIGNING_METHODS.ETH_SIGN:
            case EIP155_SIGNING_METHODS.PERSONAL_SIGN:
              return ModalStore.open("SessionSignModal", {
                requestEvent,
                requestSession,
              });

            case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA:
            case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V3:
            case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V4:
              return ModalStore.open("SessionSignTypedDataModal", {
                requestEvent,
                requestSession,
              });

            case EIP155_SIGNING_METHODS.ETH_SEND_TRANSACTION:
            case EIP155_SIGNING_METHODS.ETH_SIGN_TRANSACTION:
              return ModalStore.open("SessionSendTransactionModal", {
                requestEvent,
                requestSession,
              });

            default:
              return ModalStore.open("SessionUnsupportedMethodModal", {
                requestEvent,
                requestSession,
              });
          }
        }
      );
      web3wallet.on(
        "session_authenticate",
        (request: WalletKitTypes.SessionAuthenticate) => {
          ModalStore.open("AuthRequestModal", { request });
        }
      );
      web3wallet.engine.signClient.events.on("session_ping", (data) =>
        console.log("ping", data)
      );
      web3wallet.on("session_delete", (data) => {
        console.log("session_delete event received", data);
        SettingsStore.setSessions(
          Object.values(web3wallet.getActiveSessions())
        );
      });
    }

    try {
      web3wallet.core.pairing.events.on(
        "pairing_expire",
        pairingExpiredListener
      );
      await web3wallet.pair({ uri });
    } catch (error) {
      console.log((error as Error).message, "error");
      ModalStore.close();
      toast({
        title: "Connection Error",
        description: (error as Error).message,
        status: "error",
        isClosable: true,
        duration: 2000,
      });
      SettingsStore.setIsConnectLoading(false);
    }
  }

  useEffect(() => {
    if (pasted && initialized) {
      onConnect();
      setPasted(false);
    }
  }, [uri, initialized]);

  return (
    <>
      <FormControl mt="1rem" mb="1rem">
        <FormLabel fontWeight={"bold"}>WalletConnect URI (from dapp)</FormLabel>
        <Input
          placeholder="wc:xyz123..."
          value={uri}
          onChange={(e) => setUri(e.target.value)}
          onPaste={(e) => {
            e.preventDefault();
            setPasted(true);
            setUri(e.clipboardData.getData("text"));
          }}
          bg={"brand.lightBlack"}
        />
      </FormControl>
      <Center>
        {initialized &&
          (isConnectLoading ? (
            <Center>
              <Spinner />
              <Button
                mt="2rem"
                onClick={() => {
                  SettingsStore.setIsConnectLoading(false);
                  ModalStore.close();
                }}
              >
                Stop Loading ☠
              </Button>
            </Center>
          ) : (
            <Button onClick={() => onConnect()} isDisabled={!initialized}>
              Connect
            </Button>
          ))}
      </Center>
    </>
  );
};
