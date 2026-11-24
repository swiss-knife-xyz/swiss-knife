"use client";

import { useCallback } from "react";
import { useAccount, usePublicClient, useSwitchChain } from "wagmi";
import { type Address, type Hex, zeroAddress } from "viem";
import type {
  DecodedSignatureData,
  SessionRequest,
  WalletKitInstance,
} from "../../bridge/types";
import { generateTenderlyUrl } from "@/utils";
import type { SmartWalletConfig } from "../types";
import SessionRequestModal from "../../_components/SessionRequestModal";

interface SmartWalletSessionRequestModalProps {
  config: SmartWalletConfig;
  isOpen: boolean;
  onClose: () => void;
  currentSessionRequest: SessionRequest | null;
  decodedTxData: any;
  isDecodingTx: boolean;
  decodedSignatureData: DecodedSignatureData | null;
  pendingRequest: boolean;
  isSwitchingChain: boolean;
  needsChainSwitch: boolean;
  targetChainId: number | null;
  onChainSwitch: () => void;
  walletAddress: string;
  walletKit: WalletKitInstance | null;
  address: string | undefined;
  walletClient: any;
  setPendingRequest: (pending: boolean) => void;
  setIsSwitchingChain: (pending: boolean) => void;
  setNeedsChainSwitch: (needs: boolean) => void;
  setTargetChainId: (chainId: number | null) => void;
  toast: any;
}

export default function SmartWalletSessionRequestModal({
  config,
  isOpen,
  onClose,
  currentSessionRequest,
  decodedTxData,
  isDecodingTx,
  decodedSignatureData,
  pendingRequest,
  isSwitchingChain,
  needsChainSwitch,
  targetChainId,
  onChainSwitch,
  walletAddress,
  walletKit,
  address,
  walletClient,
  setPendingRequest,
  setIsSwitchingChain,
  setNeedsChainSwitch,
  setTargetChainId,
  toast,
}: SmartWalletSessionRequestModalProps) {
  const { address: connectedAddress } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const publicClient = usePublicClient();

  const wrapTransaction = useCallback(
    (txParams: any) => {
      const to = txParams.to as Address;
      const value = txParams.value ? BigInt(txParams.value) : BigInt(0);
      const data = (txParams.data as Hex) || "0x";
      const chainIdStr =
        currentSessionRequest?.params?.chainId?.split(":")?.[1];
      const chainId = chainIdStr ? parseInt(chainIdStr) : 0;

      return config.wrapTransaction({
        walletAddress: walletAddress as Address,
        chainId,
        to,
        value,
        data,
      });
    },
    [config, walletAddress, currentSessionRequest]
  );

  const onApprove = useCallback(async () => {
    if (!walletKit || !currentSessionRequest || !walletClient) return;

    try {
      const { id, topic, params } = currentSessionRequest;
      const { request } = params;

      let result;

      setPendingRequest(true);

      if (request.method === "eth_sendTransaction") {
        const txParams = request.params[0];
        const wrapped = wrapTransaction(txParams);

        const hash = await walletClient.sendTransaction({
          account: address as Address,
          ...wrapped,
        });

        result = hash;

        toast({
          title: `Transaction sent via ${config.shortName}`,
          status: "info",
          duration: 5000,
          isClosable: true,
          position: "bottom-right",
        });
      } else if (request.method === "personal_sign") {
        if (!config.signPersonalMessage) {
          throw new Error(
            `${config.shortName} cannot sign messages: the contract does not implement ERC-1271.`
          );
        }
        const message = request.params[0];
        const signerAddress = request.params[1];
        const requestedChainIdStr = params.chainId.split(":")[1];
        const requestedChainId = parseInt(requestedChainIdStr);

        // The dApp expects the smart wallet to be the signer (that's the
        // account announced in the WC namespace). Reject if not.
        if (signerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
          throw new Error(
            `Signer address mismatch: dApp requested ${signerAddress}, expected ${walletAddress}`
          );
        }
        if (!publicClient) throw new Error("No public client");

        result = await config.signPersonalMessage({
          walletAddress: walletAddress as Address,
          chainId: requestedChainId,
          eoa: address as Address,
          walletClient,
          publicClient,
          message,
        });
      } else if (
        request.method === "eth_signTypedData_v3" ||
        request.method === "eth_signTypedData_v4" ||
        request.method === "eth_signTypedData"
      ) {
        if (!config.signTypedData) {
          throw new Error(
            `${config.shortName} cannot sign typed data: the contract does not implement ERC-1271.`
          );
        }
        const signerAddress = request.params[0];
        const typedData =
          typeof request.params[1] === "string"
            ? JSON.parse(request.params[1])
            : request.params[1];
        const requestedChainIdStr = params.chainId.split(":")[1];
        const requestedChainId = parseInt(requestedChainIdStr);

        if (signerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
          throw new Error(
            `Signer address mismatch: dApp requested ${signerAddress}, expected ${walletAddress}`
          );
        }
        if (!publicClient) throw new Error("No public client");

        result = await config.signTypedData({
          walletAddress: walletAddress as Address,
          chainId: requestedChainId,
          eoa: address as Address,
          walletClient,
          publicClient,
          typedData,
        });
      } else if (request.method === "wallet_switchEthereumChain") {
        const requestedChainId = parseInt(request.params[0].chainId);

        if (config.walletSwitchChainBehavior === "switch") {
          setIsSwitchingChain(true);
          await switchChainAsync({ chainId: requestedChainId });
          setIsSwitchingChain(false);
          result = null;
        } else {
          // ack: smart wallet handles cross-chain execution itself
          result = null;
          if (config.ackChainSwitchToast) {
            toast({
              title: config.ackChainSwitchToast.title,
              description:
                config.ackChainSwitchToast.description(requestedChainId),
              status: "info",
              duration: 3000,
              isClosable: true,
              position: "bottom-right",
            });
          }
        }
      } else if (request.method === "wallet_addEthereumChain") {
        // For adding a new chain, just show a toast
        const chainParams = request.params[0];

        toast({
          title: "Add Chain Request",
          description: `Request to add chain ${chainParams.chainName} (${chainParams.chainId})`,
          status: "info",
          duration: 5000,
          isClosable: true,
          position: "bottom-right",
        });

        result = null;
      } else {
        // For other methods, just return success
        result = "0x";
      }

      // Respond to the request
      await walletKit.respondSessionRequest({
        topic,
        response: {
          id,
          jsonrpc: "2.0",
          result,
        },
      });

      setPendingRequest(false);
      setNeedsChainSwitch(false);
      setTargetChainId(null);

      toast({
        title: "Request approved",
        description: `Method: ${request.method}`,
        status: "success",
        duration: 3000,
        isClosable: true,
        position: "bottom-right",
      });

      onClose();
    } catch (error) {
      console.error("Failed to handle session request:", error);
      setPendingRequest(false);
      setIsSwitchingChain(false);
      toast({
        title: "Failed to handle request",
        description: (error as Error).message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-right",
      });
    }
  }, [
    walletKit,
    currentSessionRequest,
    walletClient,
    wrapTransaction,
    address,
    walletAddress,
    publicClient,
    config,
    switchChainAsync,
    setPendingRequest,
    setIsSwitchingChain,
    setNeedsChainSwitch,
    setTargetChainId,
    toast,
    onClose,
  ]);

  const onReject = useCallback(async () => {
    if (!walletKit || !currentSessionRequest) return;

    try {
      await walletKit.respondSessionRequest({
        topic: currentSessionRequest.topic,
        response: {
          id: currentSessionRequest.id,
          jsonrpc: "2.0",
          error: {
            code: 5000,
            message: "User rejected the request",
          },
        },
      });

      toast({
        title: "Request rejected",
        status: "info",
        duration: 3000,
        isClosable: true,
        position: "bottom-right",
      });

      onClose();
    } catch (error) {
      console.error("Failed to reject session request:", error);
      toast({
        title: "Failed to reject request",
        description: (error as Error).message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-right",
      });
    }
  }, [walletKit, currentSessionRequest, toast, onClose]);

  const onSimulate = useCallback(() => {
    if (!currentSessionRequest) return;
    const txData = currentSessionRequest.params.request.params[0];
    const chainId = Number(currentSessionRequest.params.chainId.split(":")[1]);
    const wrapped = wrapTransaction(txData);
    const url = generateTenderlyUrl(
      {
        from: connectedAddress || zeroAddress,
        to: wrapped.to,
        value: wrapped.value.toString(),
        data: wrapped.data,
      },
      chainId
    );
    window.open(url, "_blank");
  }, [currentSessionRequest, wrapTransaction, connectedAddress]);

  return (
    <SessionRequestModal
      isOpen={isOpen}
      onClose={onClose}
      currentSessionRequest={currentSessionRequest}
      decodedTxData={decodedTxData}
      isDecodingTx={isDecodingTx}
      decodedSignatureData={decodedSignatureData}
      pendingRequest={pendingRequest}
      isSwitchingChain={isSwitchingChain}
      needsChainSwitch={needsChainSwitch}
      targetChainId={targetChainId}
      onChainSwitch={onChainSwitch}
      onApprove={onApprove}
      onReject={onReject}
      onSimulate={onSimulate}
    />
  );
}
