import { useCallback, useState } from "react";
import {
  useUpdateEffect,
  Box,
  HStack,
  Button,
  Skeleton,
  Spinner,
  Link,
  Center,
} from "@chakra-ui/react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalLinkIcon,
} from "@chakra-ui/icons";
import { WriteButtonType } from "./ReadWriteFunction";
import { WriteButton } from "../WriteButton";
import {
  Address,
  Chain,
  ContractFunctionExecutionError,
  getContractError,
  Hex,
  parseEther,
  PublicClient,
} from "viem";
import { JsonFragmentType } from "ethers";
import { useAccount, useWalletClient } from "wagmi";
import { InputField } from "../InputField";
import { IntInput } from "./inputs";
import { waitForTransactionReceipt } from "@wagmi/core";
import { config } from "@/app/providers";
import { getTransactionError } from "viem/utils";
import { renderParamTypes } from "./Renderer";
import { slicedText } from "@/utils";

export const RawCalldata = ({
  readAllCollapsed,
  chainId,
  address,
  client,
}: {
  readAllCollapsed?: boolean;
  chainId: number;
  address: string;
  client: PublicClient;
}) => {
  const { data: walletClient } = useWalletClient();
  const { address: userAddress, chain } = useAccount();

  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);
  const [payableETH, setPayableETH] = useState<string>("0");
  const [payableETHIsDisabled, setPayableETHIsDisabled] =
    useState<boolean>(false);
  const [calldata, setCalldata] = useState<string>();

  const [loading, setLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const [res, setRes] = useState<any>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [confirmedTxHash, setConfirmedTxHash] = useState<string | null>(null);

  const [writeButtonType, setWriteButtonType] = useState<WriteButtonType>(
    WriteButtonType.Write
  );

  useUpdateEffect(() => {
    setIsCollapsed(readAllCollapsed !== undefined ? readAllCollapsed : false);
  }, [readAllCollapsed]);

  const writeFunction = useCallback(async () => {
    if (isError) {
      setIsError(false);
    }

    if (walletClient) {
      setLoading(true);
      setTxHash(null);
      setConfirmedTxHash(null);

      try {
        const hash = await walletClient.sendTransaction({
          to: address as Address,
          data: calldata as Hex,
          value: BigInt(payableETH),
        });

        setLoading(false);

        setTxHash(hash);

        await waitForTransactionReceipt(config, {
          hash,
        });

        setConfirmedTxHash(hash);
      } catch (e: any) {
        console.error(e);
        setIsError(true);

        setErrorMsg(
          getTransactionError(e, {
            account: walletClient.account,
            docsPath: "",
          }).shortMessage
        );
      } finally {
        setLoading(false);
      }
    }
  }, [isError, address, calldata, payableETH, walletClient]);

  const callAsReadFunction = useCallback(async () => {
    if (isError) {
      setIsError(false);
    }

    setLoading(true);
    setRes(null);

    try {
      const result = await client.call({
        to: address as Hex,
        data: calldata as Hex,
        value: BigInt(payableETH),
      });
      setRes(result.data);
    } catch (e: any) {
      console.error(e);
      setIsError(true);

      setRes(null);

      setErrorMsg("An unknown error occurred");
    } finally {
      setLoading(false);
    }
  }, [address, calldata, client, isError, payableETH]);

  // FIXME: make functional
  const simulateOnTenderly = () => {};

  const renderRes = () => {
    if (res !== null) {
      return (
        <Box>
          <Box mt={2} rounded={"md"}>
            {renderParamTypes({
              chainId,
              type: "calldata",
              value: res,
            })}
          </Box>
        </Box>
      );
    } else if (loading && writeButtonType === WriteButtonType.CallAsViewFn) {
      return <Skeleton mt={2} h={"5rem"} rounded={"lg"} />;
    } else {
      return <></>;
    }
  };

  return (
    <Box
      pt={2}
      mb={2}
      px={2}
      pb={isCollapsed ? 2 : 6}
      border="2px solid"
      borderColor="whiteAlpha.200"
      rounded="md"
      bg={"whiteAlpha.50"}
    >
      {/* Function name and refetch button */}
      <HStack>
        <HStack
          flexGrow={1}
          onClick={() => setIsCollapsed(!isCollapsed)}
          cursor={"pointer"}
        >
          <HStack>
            <Box fontSize={"2xl"}>
              {isCollapsed ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </Box>
            <HStack alignItems={"flex-end"}>
              <Box fontSize={"md"} fontWeight={"normal"}>
                0.
              </Box>
              <Box fontWeight={"bold"}>Raw Calldata</Box>
            </HStack>
          </HStack>
        </HStack>
        {/* Write Button */}
        <WriteButton
          isError={isError}
          userAddress={userAddress}
          writeButtonType={writeButtonType}
          chain={chain}
          chainId={chainId}
          writeFunction={writeFunction}
          callAsReadFunction={callAsReadFunction}
          simulateOnTenderly={simulateOnTenderly}
          isDisabled={payableETHIsDisabled}
          loading={loading}
          setWriteButtonType={setWriteButtonType}
          setIsError={setIsError}
        />
      </HStack>
      <Box mt={4} ml={4} px={4} display={isCollapsed ? "none" : undefined}>
        {/* Inputs */}
        <>
          <Box mb={4} p={4} bg="whiteAlpha.100" rounded={"lg"}>
            <IntInput
              input={{
                name: "Payable ETH",
                type: "uint256",
              }}
              value={payableETH}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setPayableETH(e.target.value);
              }}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {}}
              isInvalid={
                isError &&
                (payableETH === undefined ||
                  payableETH === null ||
                  payableETH.toString().trim().length === 0)
              }
              functionIsError={isError}
              setFunctionIsDisabled={setPayableETHIsDisabled}
            />
          </Box>
          <InputField
            value={calldata}
            onChange={(e) => setCalldata(e.target.value)}
            placeholder="Enter calldata to transact"
            isInvalid={isError}
          />
        </>
        {/* Output fields for Read or Call as View Fn */}
        <Box mt={2} ml={4} mb={4}>
          {!isError && renderRes()}
        </Box>
        {/* Transaction status for Write */}
        {txHash && !confirmedTxHash && (
          <Box mt={4} ml={4}>
            <HStack p={4} bg="blue.500" rounded={"md"}>
              <HStack>
                <Spinner />
                <Box fontWeight={"bold"}>Transaction initiated:</Box>
              </HStack>
              <Box>
                <Link
                  href={`${chain?.blockExplorers?.default.url}/tx/${txHash}`}
                  isExternal
                >
                  <HStack>
                    <Box>{slicedText(txHash, 10)}</Box>
                    <ExternalLinkIcon />
                  </HStack>
                </Link>
              </Box>
            </HStack>
          </Box>
        )}

        {confirmedTxHash && (
          <Box mt={4} ml={4}>
            <HStack p={4} bg="green.500" rounded={"md"}>
              <Box fontWeight={"bold"}>✅ Transaction confirmed:</Box>
              <Box>
                <Link
                  href={`${chain?.blockExplorers?.default.url}/tx/${confirmedTxHash}`}
                  isExternal
                >
                  <HStack>
                    <Box>{slicedText(confirmedTxHash, 10)}</Box>
                    <ExternalLinkIcon />
                  </HStack>
                </Link>
              </Box>
            </HStack>
          </Box>
        )}
        {isError && errorMsg && (
          <Center mt={2} p={4} color="red.300" maxW="40rem">
            {errorMsg}
          </Center>
        )}
      </Box>
    </Box>
  );
};
