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
    <HStack minW={0} flexWrap="wrap" columnGap={2} rowGap={0} fontSize={{ base: "sm", md: "md" }}>
      {prefix && <Box color="whiteAlpha.600">{prefix}</Box>}
      {input.name ? (
        <>
          <Box minW={0} overflowWrap="anywhere">{input.name}</Box>{" "}
          <Box fontSize={"sm"} color="whiteAlpha.600">
            ({input.type})
          </Box>
        </>
      ) : (
        <Box color="whiteAlpha.800" overflowWrap="anywhere">{input.type}</Box>
      )}
    </HStack>
  );
};
