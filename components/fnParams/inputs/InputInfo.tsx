import { useCompactParameterInputs } from "../ParameterInputStyle";
import { Box, HStack } from "@chakra-ui/react";
import { JsonFragment } from "ethers";

export const InputInfo = ({
  input,
  prefix,
}: {
  input: JsonFragment;
  prefix?: string;
}) => {
  const compact = useCompactParameterInputs();
  return (
    <HStack
      className="fn-input-info"
      minW={0}
      flexWrap="wrap"
      columnGap={2}
      rowGap={0}
      fontSize={compact ? "xs" : { base: "sm", md: "md" }}
      mb={compact ? 1.5 : undefined}
      color={compact ? "text.secondary" : undefined}
      sx={compact ? { "& > *": { fontSize: "inherit" } } : undefined}
    >
      {prefix && <Box color="whiteAlpha.600">{prefix}</Box>}
      {input.name ? (
        <>
          <Box minW={0} overflowWrap="anywhere">
            {input.name}
          </Box>{" "}
          <Box fontSize={"sm"} color="whiteAlpha.600">
            ({input.type})
          </Box>
        </>
      ) : (
        <Box color="whiteAlpha.800" overflowWrap="anywhere">
          {input.type}
        </Box>
      )}
    </HStack>
  );
};
