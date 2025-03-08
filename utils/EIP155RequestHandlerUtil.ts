import { EIP155_SIGNING_METHODS } from "@/data/EIP155Data";
import { getSignParamsMessage } from "@/utils/HelperUtil";
import { formatJsonRpcError, formatJsonRpcResult } from "@json-rpc-tools/utils";
import { WalletKitTypes } from "@reown/walletkit";
import { getSdkError } from "@walletconnect/utils";
import { Address, Hex, hashMessage } from "viem";

type RequestEventArgs = Omit<WalletKitTypes.SessionRequest, "verifyContext">;

interface SendTransactionRequest {
  chainId: string;
  from: Address;
  to: Address;
  data?: Hex;
  value?: Hex;
  gas?: Hex;
}

export async function approveEIP155Request({
  requestEvent,
  signMsg,
  sendTransaction,
}: {
  requestEvent: RequestEventArgs;
  signMsg?: (msg: string) => Promise<Hex>;
  sendTransaction?: (tx: SendTransactionRequest) => Promise<Hex>;
}) {
  const { params, id } = requestEvent;
  const { chainId, request } = params;

  console.log(requestEvent, chainId, "approveEIP155Request");

  switch (request.method) {
    case EIP155_SIGNING_METHODS.WALLET_SWITCH_ETHEREUM_CHAIN:
    case EIP155_SIGNING_METHODS.WALLET_ADD_ETHEREUM_CHAIN: {
      return formatJsonRpcResult(id, null);
    }
    case EIP155_SIGNING_METHODS.PERSONAL_SIGN:
    case EIP155_SIGNING_METHODS.ETH_SIGN:
      try {
        const message = getSignParamsMessage(request.params);
        const hashedMessage = hashMessage(message);

        if (!signMsg) {
          throw new Error("signMsg is required");
        }

        const signedMessage = await signMsg(message);
        console.log({
          PERSONAL_SIGN: "PERSONAL_SIGN",
          hashedMessage,
          signature: signedMessage,
          message,
          params: request.params,
        });

        return formatJsonRpcResult(id, signedMessage);
      } catch (error: any) {
        console.error(error);
        alert(error.message);
        return formatJsonRpcError(id, error.message);
      }

    /** 
    case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA:
    case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V3:
    case EIP155_SIGNING_METHODS.ETH_SIGN_TYPED_DATA_V4:
      try {
        const {
          domain,
          types,
          message: data,
          primaryType,
        } = getSignTypedDataParamsData(request.params);

        // https://github.com/ethers-io/ethers.js/issues/687#issuecomment-714069471
        delete types.EIP712Domain;
        const signedData = await wallet._signTypedData(
          domain,
          types,
          data,
          primaryType
        );
        return formatJsonRpcResult(id, signedData);
      } catch (error: any) {
        console.error(error);
        alert(error.message);
        return formatJsonRpcError(id, error.message);
      }
    */
    case EIP155_SIGNING_METHODS.ETH_SEND_TRANSACTION:
      try {
        if (!sendTransaction) {
          throw new Error("sendTransaction is required");
        }

        const sendTransactionRequest = request
          .params[0] as SendTransactionRequest;
        const hash = await sendTransaction({
          ...sendTransactionRequest,
          chainId,
        });
        return formatJsonRpcResult(id, hash);
      } catch (error: any) {
        console.error(error);
        alert(error.message);
        return formatJsonRpcError(id, error.message);
      }
    /** 
    case EIP155_SIGNING_METHODS.ETH_SIGN_TRANSACTION:
      try {
        const signTransaction = request.params[0];
        const signature = await wallet.signTransaction(signTransaction);
        return formatJsonRpcResult(id, signature);
      } catch (error: any) {
        console.error(error);
        alert(error.message);
        return formatJsonRpcError(id, error.message);
      }

    */
    default:
      throw new Error(getSdkError("INVALID_METHOD").message);
  }
}

export function rejectEIP155Request(request: RequestEventArgs) {
  const { id } = request;

  return formatJsonRpcError(id, getSdkError("USER_REJECTED").message);
}
