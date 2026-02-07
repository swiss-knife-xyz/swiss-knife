import { Address, encodeAbiParameters, encodeFunctionData, Hex } from "viem";
import { QuoteExactInputParams } from "./types";
import { IV4RouterAbiExactInput } from "./abi/IV4RouterAbiExactInput";
import { UniversalRouterAbi } from "./abi/UniversalRouter";

const V4Actions = {
  SWAP_EXACT_IN: "07",
  SWAP_EXACT_OUT: "09",
  SETTLE_ALL: "0c",
  TAKE_ALL: "0f",
};

const URCommands = {
  V4_SWAP: "10",
  SWEEP: "04",
  PERMIT2_PERMIT: "0a",
};

export const getExactInputCalldata = ({
  quoteParams,
  amountOutMin,
  tokenOut,
}: {
  quoteParams: QuoteExactInputParams;
  amountOutMin: bigint;
  tokenOut: Address;
}) => {
  const v4Actions = ("0x" +
    V4Actions.SWAP_EXACT_IN +
    V4Actions.SETTLE_ALL +
    V4Actions.TAKE_ALL) as Hex;

  const v4Params = encodeAbiParameters(IV4RouterAbiExactInput, [
    {
      currencyIn: quoteParams.exactCurrency,
      path: quoteParams.path,
      amountIn: quoteParams.exactAmount,
      amountOutMinimum: amountOutMin,
    },
  ]);

  const settleParams = encodeAbiParameters(
    [
      {
        type: "address",
        name: "currency",
      },
      {
        type: "uint256",
        name: "maxAmount",
      },
    ],
    [quoteParams.exactCurrency, quoteParams.exactAmount]
  );

  const takeParams = encodeAbiParameters(
    [
      {
        type: "address",
        name: "currency",
      },
      {
        type: "uint256",
        name: "minAmount",
      },
    ],
    [tokenOut, amountOutMin]
  );

  // Encode router data
  const v4RouterData = encodeAbiParameters(
    [
      { type: "bytes", name: "actions" },
      { type: "bytes[]", name: "params" },
    ],
    [v4Actions, [v4Params, settleParams, takeParams]]
  );

  // Commands for Universal Router
  const urCommands = ("0x" + URCommands.V4_SWAP) as Hex;

  // Encode calldata for Universal Router
  const inputs = [v4RouterData];
  const urExecuteCalldata = encodeFunctionData({
    abi: UniversalRouterAbi,
    functionName: "execute",
    args: [urCommands, inputs],
  });

  return urExecuteCalldata;
};
