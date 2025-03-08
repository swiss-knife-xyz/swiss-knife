import { SessionTypes } from "@walletconnect/types";
import { WalletKitTypes } from "@reown/walletkit";
import { proxy } from "valtio";

/**
 * Types
 */
interface ModalData {
  proposal?: WalletKitTypes.SessionProposal;
  requestEvent?: WalletKitTypes.SessionRequest;
  requestSession?: SessionTypes.Struct;
  request?: WalletKitTypes.SessionAuthenticate;
  loadingMessage?: string;
}

interface State {
  open: boolean;
  view?:
    | "SessionProposalModal"
    | "SessionSignModal"
    | "SessionSignTypedDataModal"
    | "SessionSendTransactionModal"
    | "SessionUnsupportedMethodModal"
    | "SessionSignCosmosModal"
    | "SessionSignSolanaModal"
    | "SessionSignPolkadotModal"
    | "SessionSignNearModal"
    | "SessionSignMultiversxModal"
    | "SessionSignTronModal"
    | "SessionSignTezosModal"
    | "SessionSignKadenaModal"
    | "AuthRequestModal"
    | "LoadingModal";
  data?: ModalData;
}

/**
 * State
 */
const state = proxy<State>({
  open: false,
});

/**
 * Store / Actions
 */
const ModalStore = {
  state,

  open(view: State["view"], data: State["data"]) {
    state.view = view;
    state.data = data;
    state.open = true;
  },

  close() {
    state.open = false;
  },
};

export default ModalStore;
