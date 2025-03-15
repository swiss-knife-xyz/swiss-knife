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
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@chakra-ui/react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalLinkIcon,
  SettingsIcon,
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
  zeroAddress,
} from "viem";
import { JsonFragmentType } from "ethers";
import { useAccount, useWalletClient } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { InputField } from "../InputField";
import { AddressInput, IntInput } from "./inputs";
import { config } from "@/app/providers";
import { getTransactionError } from "viem/utils";
import { renderParamTypes } from "./Renderer";
import { generateTenderlyUrl, slicedText } from "@/utils";

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
  const [settingsSenderAddr, setSettingsSenderAddr] = useState<string>("");
  const [settingsIsOpen, setSettingsIsOpen] = useState<boolean>(false);

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

  const simulateOnTenderly = useCallback(async () => {
    if (isError) {
      setIsError(false);
    }

    setLoading(true);

    const tenderlyUrl = generateTenderlyUrl(
      {
        from:
          settingsSenderAddr.length > 0
            ? settingsSenderAddr
            : userAddress ?? zeroAddress,
        to: address,
        value: payableETH,
        data: calldata ?? "0x",
      },
      chainId
    );
    window.open(tenderlyUrl, "_blank");

    setLoading(false);
  }, [
    address,
    calldata,
    chainId,
    isError,
    payableETH,
    settingsSenderAddr,
    userAddress,
  ]);

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
        {writeButtonType === WriteButtonType.SimulateOnTenderly && (
          <Popover
            placement="bottom-start"
            isOpen={settingsIsOpen}
            onOpen={() => setSettingsIsOpen(true)}
            onClose={() => setSettingsIsOpen(false)}
          >
            <PopoverTrigger>
              <Box>
                <Button size="sm">
                  <SettingsIcon
                    transition="900ms rotate ease-in-out"
                    transform={
                      settingsIsOpen ? "rotate(33deg)" : "rotate(0deg)"
                    }
                  />
                </Button>
              </Box>
            </PopoverTrigger>
            <PopoverContent
              minW="30rem"
              border={"1px solid"}
              borderColor={"whiteAlpha.400"}
              bg="bg.900"
              boxShadow="xl"
              rounded="xl"
              overflowY="auto"
            >
              <Box px="1rem" py="1rem">
                <Box mt={4}>
                  <AddressInput
                    input={{
                      name: "(optional) Sender",
                      type: "address",
                    }}
                    value={settingsSenderAddr}
                    chainId={chainId}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setSettingsSenderAddr(e.target.value);
                    }}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {}}
                    isInvalid={false}
                    setFunctionIsDisabled={() => {}}
                    hideTags
                  />
                </Box>
              </Box>
            </PopoverContent>
          </Popover>
        )}
      </HStack>
      <Box mt={4} ml={4} px={4} display={isCollapsed ? "none" : undefined}>
        {/* Inputs */}
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
          <Box mb={4}>
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
        <>
          <Box mb={4} p={4} bg="whiteAlpha.100" rounded={"lg"}>
            <IntInput
              input={{
                name: "Payable ETH",
                type: "uint256",
              }}
              defaultEthFormatIndex={1}
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
      </Box>
    </Box>
  );
};
