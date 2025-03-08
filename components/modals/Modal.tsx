import { useCallback, useMemo } from "react";
import { Modal as CModal, ModalOverlay } from "@chakra-ui/react";
import ModalStore from "@/store/ModalStore";
import { useSnapshot } from "valtio";
import { SessionProposalModal } from "@/components/modals/SessionProposalModal";
import { SessionSignModal } from "@/components/modals/SessionSignModal";
import { SessionSendTransactionModal } from "@/components/modals/SessionSendTransactionModal";
import { SessionUnsupportedMethodModal } from "@/components/modals/SessionUnsupportedMethodModal";
import { rejectEIP155Request } from "@/utils/EIP155RequestHandlerUtil";
import { web3wallet } from "@/utils/WalletConnectUtil";

export const Modal = () => {
  const { open, view } = useSnapshot(ModalStore.state);

  // Get request and wallet data from store
  const requestEvent = ModalStore.state.data?.requestEvent;
  const requestSession = ModalStore.state.data?.requestSession;

  const topic = requestEvent?.topic;
  const params = requestEvent?.params;

  // Handle reject action
  const onReject = useCallback(async () => {
    if (requestEvent && topic && open) {
      const response = rejectEIP155Request(requestEvent);
      try {
        await web3wallet.respondSessionRequest({
          topic,
          response,
        });
      } catch (e) {
        console.log((e as Error).message, "error");
        return;
      }
      ModalStore.close();
    } else if (open) {
      ModalStore.close();
    }
  }, [requestEvent, topic, open]);

  const componentView = useMemo(() => {
    switch (view) {
      case "SessionProposalModal":
        return <SessionProposalModal />;
      case "SessionSignModal":
        return <SessionSignModal />;
      case "SessionSendTransactionModal":
        return <SessionSendTransactionModal />;
      case "SessionUnsupportedMethodModal":
        return <SessionUnsupportedMethodModal />;
      default:
        return null;
    }
  }, [view]);

  return (
    <CModal isOpen={open} onClose={onReject} isCentered>
      <ModalOverlay bg="none" backdropFilter="auto" backdropBlur="3px" />
      {componentView}
    </CModal>
  );
};
