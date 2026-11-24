"use client";
import { Box, Text } from "@chakra-ui/react";
import { CalldataTree } from "@/components/decodedParams/CalldataTree";
import type { DecodedTraceCall } from "@/lib/tracer/decode";
import type { TraceCall } from "@/lib/tracer/model";
import { getDisplayFunctionName } from "@/utils/functionNames";
import { TraceData } from "./TraceData";

export function TraceDecodedValues({
  call,
  decoded,
  chainId,
  resolveAddresses = true,
}: {
  call: TraceCall;
  decoded: DecodedTraceCall;
  chainId?: number;
  resolveAddresses?: boolean;
}) {
  return (
    <Box display="grid" gap={3} minW={0}>
      <Box minW={0}>
        <Text fontSize="xs" color="text.secondary" mb={1}>
          Input{decoded.inputInferred ? " · inferred" : ""}
        </Text>
        {decoded.input ? (
          <CalldataTree
            rawUnitLabel="Raw"
            resolveAddressMetadata={resolveAddresses}
            args={decoded.input.args}
            functionName={
              getDisplayFunctionName(
                decoded.input.functionName,
                decoded.input.guessedFunctionName
              ).name
            }
            isFunctionNameGuessed={decoded.inputInferred}
            chainId={chainId}
            showControls={false}
          />
        ) : call.input === "0x" ? (
          <Text fontSize="xs" fontFamily="mono" color="text.secondary">
            ()
          </Text>
        ) : (
          <TraceData
            label={
              call.type.startsWith("CREATE") ? "Initcode" : "Unknown input"
            }
            value={call.input}
          />
        )}
      </Box>
      <Box minW={0}>
        <Text
          fontSize="xs"
          color={call.error ? "red.300" : "text.secondary"}
          mb={1}
        >
          {call.error ? "Revert" : "Return values"}
        </Text>
        {call.error ? (
          decoded.revert ? (
            <CalldataTree
              rawUnitLabel="Raw"
              resolveAddressMetadata={resolveAddresses}
              args={decoded.revert.args}
              functionName={decoded.revert.functionName}
              kind="revert"
              decodeNote={decoded.revert.decodeNote}
              showControls={false}
              chainId={chainId}
            />
          ) : (
            <TraceData label="Unknown revert data" value={call.output} />
          )
        ) : decoded.outputs !== undefined ? (
          decoded.outputs.length ? (
            <CalldataTree
              rawUnitLabel="Raw"
              resolveAddressMetadata={resolveAddresses}
              args={decoded.outputs}
              chainId={chainId}
              showControls={false}
            />
          ) : (
            <Text fontSize="xs" fontFamily="mono" color="text.secondary">
              ()
            </Text>
          )
        ) : call.output === "0x" ? (
          <Text fontSize="xs" fontFamily="mono" color="text.secondary">
            0x
          </Text>
        ) : (
          <TraceData
            label={
              call.type.startsWith("CREATE")
                ? "Deployed bytecode"
                : "Unknown return data"
            }
            value={call.output}
          />
        )}
      </Box>
    </Box>
  );
}
