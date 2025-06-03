// Export the main connector and provider functionality
export { impersonator, type ImpersonatorParameters } from "./connector";
export {
  createImpersonatorEip1193Provider,
  getStoredImpersonatorAddress,
  setStoredImpersonatorAddress,
  IMPERSONATOR_ADDRESS_KEY,
  type ImpersonatorProviderDependencies,
} from "./provider";

// Export the UI components
export {
  ImpersonatorModal,
  useImpersonatorModal,
  ImpersonatorFloatingButton,
} from "./ui";

export { impersonatorWallet } from "./rainbowkit";
