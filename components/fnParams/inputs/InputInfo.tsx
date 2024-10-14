import { Box, HStack } from "@chakra-ui/react";
import { JsonFragment } from "ethers";

export const InputInfo = ({
  input,
  prefix,
}: {
  input: JsonFragment;
  prefix?: string;
}) => {
  return (
    <HStack>
      {prefix && <Box color="whiteAlpha.600">{prefix}</Box>}
      {input.name ? (
        <>
          <Box>{input.name}</Box>{" "}
          <Box fontSize={"sm"} color="whiteAlpha.600">
            ({input.type})
          </Box>
        </>
      ) : (
        <Box color="whiteAlpha.800">{input.type}</Box>
      )}
    </HStack>
  );
};
