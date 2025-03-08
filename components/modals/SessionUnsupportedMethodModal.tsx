import { useState, useCallback } from "react";
import {
  Box,
  Button,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Text,
  Center,
  Avatar,
  HStack,
  Spacer,
} from "@chakra-ui/react";
import { CodeBlock, codepen } from "react-code-blocks";
import ModalStore from "@/store/ModalStore";
import { rejectEIP155Request } from "@/utils/EIP155RequestHandlerUtil";
import { web3wallet } from "@/utils/WalletConnectUtil";
import { CopyToClipboard } from "@/components/CopyToClipboard";

export const SessionUnsupportedMethodModal = () => {
  const [isLoadingApprove, setIsLoadingApprove] = useState(false);
  const [isLoadingReject, setIsLoadingReject] = useState(false);

  // Get request and wallet data from store
  const requestEvent = ModalStore.state.data?.requestEvent;
  const requestSession = ModalStore.state.data?.requestSession;

  const topic = requestEvent?.topic;
  const params = requestEvent?.params;

  // Handle approve action
  const onApprove = useCallback(async () => {
    if (requestEvent && topic) {
      setIsLoadingApprove(true);
      try {
        // const response = await approveEIP155Request(requestEvent)
        // await web3wallet.respondSessionRequest({
        //   topic,
        //   response
        // })
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

  // Ensure request and wallet are defined
  if (!requestEvent || !requestSession) {
    return <Text>Missing request data</Text>;
  }

  const { icons, name, url } = requestSession.peer.metadata;

  return (
    <ModalContent bg={"gray.900"}>
      <ModalHeader>{params?.request.method}</ModalHeader>
      <ModalCloseButton />
      <ModalBody>
        <Center>
          <Avatar src={icons[0]} mr="2rem" />
          <Box>
            <Text>{name}</Text>
            <Text color={"whiteAlpha.600"}>{url}</Text>
          </Box>
        </Center>
        <Box mt="1rem">
          <HStack>
            <Text color="whiteAlpha.500">Request Data:</Text>
            <Spacer />
            <CopyToClipboard
              textToCopy={JSON.stringify(requestEvent, null, 2)}
              labelText=""
              size={"xs"}
            />
          </HStack>
          <Box
            maxH="200px"
            overflowY="auto"
            p="2"
            bg="gray.800"
            borderRadius="md"
          >
            <CodeBlock
              showLineNumbers={false}
              text={JSON.stringify(requestEvent, null, 2)}
              theme={codepen}
              language="json"
            />
          </Box>
        </Box>
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
            isDisabled={true}
          >
            Approve
          </Button>
        </HStack>
      </ModalFooter>
    </ModalContent>
  );
};
