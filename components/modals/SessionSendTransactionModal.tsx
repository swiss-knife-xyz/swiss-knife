/* eslint-disable react-hooks/rules-of-hooks */
import { useCallback, useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Container,
  HStack,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Text,
  Center,
  Spacer,
  Stack,
  Spinner,
} from "@chakra-ui/react";
import { useSendTransaction } from "wagmi";
import { CodeBlock, codepen } from "react-code-blocks";
import { decodeRecursive } from "@/lib/decoder";
import { DecodeRecursiveResult } from "@/types";

import ModalStore from "@/store/ModalStore";
import {
  approveEIP155Request,
  rejectEIP155Request,
} from "@/utils/EIP155RequestHandlerUtil";
import { web3wallet } from "@/utils/WalletConnectUtil";
import { CopyToClipboard } from "@/components/CopyToClipboard";
import { stringify } from "viem";
import { renderParams } from "@/components/renderParams";
import { chainIdToChain } from "@/data/common";

export const SessionSendTransactionModal = () => {
  const { sendTransactionAsync } = useSendTransaction();

  const [isLoadingApprove, setIsLoadingApprove] = useState(false);
  const [isLoadingReject, setIsLoadingReject] = useState(false);

  const [decoded, setDecoded] = useState<DecodeRecursiveResult | null>();

  // Get request and wallet data from store
  const requestEvent = ModalStore.state.data?.requestEvent;
  const requestSession = ModalStore.state.data?.requestSession;

  const topic = requestEvent?.topic;
  const params = requestEvent?.params;
  const chainId = params?.chainId;
  const request = params?.request;
  const transaction = request?.params[0];

  useEffect(() => {
    const decodeCalldata = async () => {
      if (chainId) {
        const res = await decodeRecursive({
          address: transaction.to,
          calldata: transaction.data,
          chainId: parseInt(chainId.split(":")[1]),
        });
        console.log({ DECODED_RESULT: res });
        setDecoded(res);
      }
    };

    decodeCalldata();
  }, [chainId, transaction?.to, transaction?.data]);

  // Ensure request and wallet are defined
  if (!request || !requestSession) {
    return <Text>Missing request data</Text>;
  }

  // Handle approve action
  const onApprove = useCallback(async () => {
    if (requestEvent && topic) {
      setIsLoadingApprove(true);
      try {
        const response = await approveEIP155Request({
          requestEvent,
          sendTransaction: async (tx) => {
            console.log("sendTransaction", tx);
            const response = await sendTransactionAsync({
              chainId: parseInt(tx.chainId.split(":")[1]),
              account: tx.from,
              to: tx.to,
              data: tx.data,
              value: tx.value ? BigInt(tx.value) : undefined,
              gas: tx.gas ? BigInt(tx.gas) : undefined,
            });
            return response;
          },
        });
        await web3wallet.respondSessionRequest({
          topic,
          response,
        });
      } catch (e) {
        setIsLoadingApprove(false);
        console.log((e as Error).message, "error");
        return;
      }
      setIsLoadingApprove(false);
      ModalStore.close();
    }
  }, [requestEvent, topic]);

  // Handle reject action
  const onReject = useCallback(async () => {
    if (requestEvent && topic) {
      setIsLoadingReject(true);
      const response = rejectEIP155Request(requestEvent);
      try {
        await web3wallet.respondSessionRequest({
          topic,
          response,
        });
      } catch (e) {
        setIsLoadingReject(false);
        console.log((e as Error).message, "error");
        return;
      }
      setIsLoadingReject(false);
      ModalStore.close();
    }
  }, [requestEvent, topic]);

  const { icons, name, url } = requestSession.peer.metadata;

  return (
    <ModalContent
      bg={"gray.900"}
      minW={{
        base: 0,
        sm: "30rem",
        md: "40rem",
        lg: "60rem",
      }}
    >
      <ModalHeader>Sign a Transaction</ModalHeader>
      <ModalCloseButton />
      <ModalBody>
        <Center>
          <Avatar src={icons[0]} mr="2rem" />
          <Box>
            <Text>{name}</Text>
            <Text color={"whiteAlpha.600"}>{url}</Text>
          </Box>
        </Center>
        <Container mt="1rem">
          {chainId ? (
            <Box color="whiteAlpha.500">
              Chain: {chainIdToChain[parseInt(chainId.split(":")[1])].name}
            </Box>
          ) : null}
          {/* TODO: have toggle to show raw transaction */}
          {!decoded ? (
            // <Box>
            //   <Text color="whiteAlpha.500">Data:</Text>
            //   <CodeBlock
            //     showLineNumbers={false}
            //     text={JSON.stringify(transaction, null, 2)}
            //     theme={codepen}
            //     language="json"
            //   />
            // </Box>
            <Spinner />
          ) : (
            <Box minW={"80%"}>
              {decoded.functionName &&
              decoded.functionName !== "__abi_decoded__" ? (
                <HStack>
                  <Box>
                    <Box fontSize={"xs"} color={"whiteAlpha.600"}>
                      function
                    </Box>
                    <Box>{decoded.functionName}</Box>
                  </Box>
                  <Spacer />
                  <CopyToClipboard
                    textToCopy={JSON.stringify(
                      {
                        function: decoded.signature,
                        params: JSON.parse(stringify(decoded.rawArgs)),
                      },
                      undefined,
                      2
                    )}
                    labelText={"Copy params"}
                  />
                </HStack>
              ) : null}
              <Stack
                mt={2}
                p={4}
                spacing={4}
                bg={"whiteAlpha.50"}
                rounded={"lg"}
              >
                {decoded.args.map((arg: any, i: number) => {
                  return renderParams(i, arg);
                })}
              </Stack>
            </Box>
          )}
        </Container>
      </ModalBody>
      <ModalFooter>
        <HStack>
          <Button
            onClick={() => onReject()}
            isLoading={isLoadingReject}
            colorScheme={"red"}
          >
            Reject
          </Button>
          <Button
            onClick={() => onApprove()}
            isLoading={isLoadingApprove}
            colorScheme={"green"}
          >
            Approve
          </Button>
        </HStack>
      </ModalFooter>
    </ModalContent>
  );
};
