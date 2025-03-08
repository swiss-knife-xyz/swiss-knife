import { Verify, SessionTypes } from "@walletconnect/types";
import { proxy } from "valtio";

/**
 * Types
 */
interface State {
  initialized: boolean;
  ensAvatar?: string;
  currentRequestVerifyContext?: Verify.Context;
  sessions: SessionTypes.Struct[];
  isConnectLoading: boolean;
  isEventsInitialized: boolean;
}

/**
 * State
 */
const state = proxy<State>({
  initialized: false,
  sessions: [],
  isConnectLoading: false,
  isEventsInitialized: false,
});

/**
 * Store / Actions
 */
const SettingsStore = {
  state,

  setInitialized(value: boolean) {
    state.initialized = value;
  },

  setEnsAvatar(ensAvatar: string) {
    state.ensAvatar = ensAvatar;
  },

  setCurrentRequestVerifyContext(context: Verify.Context) {
    state.currentRequestVerifyContext = context;
  },
  setSessions(sessions: SessionTypes.Struct[]) {
    state.sessions = sessions;
  },

  setIsConnectLoading(isConnectLoading: boolean) {
    state.isConnectLoading = isConnectLoading;
  },

  setIsEventsInitialized(isEventsInitialized: boolean) {
    state.isEventsInitialized = isEventsInitialized;
  },
};

export default SettingsStore;
