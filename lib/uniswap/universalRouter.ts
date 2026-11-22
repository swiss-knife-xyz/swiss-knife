import {
  Address,
  encodeAbiParameters,
  encodeFunctionData,
  Hex,
  maxUint128,
  zeroAddress,
} from "viem";
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
  recipient,
  deadline,
}: {
  quoteParams: QuoteExactInputParams;
  amountOutMin: bigint;
  tokenOut: Address;
  recipient: Address;
  deadline: bigint;
}) => {
  if (
    quoteParams.exactAmount <= 0n ||
    quoteParams.exactAmount > maxUint128 ||
    amountOutMin <= 0n ||
    amountOutMin > maxUint128
  ) {
    throw new RangeError("Swap input and minimum output must fit uint128.");
  }
  if (deadline <= 0n) throw new RangeError("Swap deadline must be positive.");

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
  const commandCodes = [URCommands.V4_SWAP];

  // Encode calldata for Universal Router
  const inputs: Hex[] = [v4RouterData];
  if (quoteParams.exactCurrency === zeroAddress) {
    commandCodes.push(URCommands.SWEEP);
    inputs.push(
      encodeAbiParameters(
        [
          { type: "address", name: "token" },
          { type: "address", name: "recipient" },
          { type: "uint256", name: "amountMinimum" },
        ],
        [zeroAddress, recipient, 0n]
      )
    );
  }
  const urCommands = `0x${commandCodes.join("")}` as Hex;
  const urExecuteCalldata = encodeFunctionData({
    abi: UniversalRouterAbi,
    functionName: "execute",
    args: [urCommands, inputs, deadline],
  });

  return urExecuteCalldata;
};
