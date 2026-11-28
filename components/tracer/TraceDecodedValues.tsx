"use client";
import { Box, Text } from "@chakra-ui/react";
import { CalldataTree } from "@/components/decodedParams/CalldataTree";
import type { DecodedTraceCall } from "@/lib/tracer/decode";
import type { TraceCall } from "@/lib/tracer/model";
import { getDisplayFunctionName } from "@/utils/functionNames";
import { TraceData, traceFieldLabelProps } from "./TraceData";
import { TraceReturnValues } from "./TraceReturnValues";

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
        <Text {...traceFieldLabelProps} color="text.secondary" mb={1}>
          Input
        </Text>
        {decoded.input ? (
          <CalldataTree
            rawUnitLabel="Raw"
            resolveAddressMetadata={resolveAddresses}
            args={decoded.input.args}
            defaultRootExpanded={decoded.input.args.length > 0}
            functionName={
              getDisplayFunctionName(
                decoded.input.functionName,
                decoded.input.guessedFunctionName
              ).name
            }
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
              call.type.startsWith("CREATE") ? "Initcode" : "Input"
            }
            hideLabel={!call.type.startsWith("CREATE")}
            value={call.input}
          />
        )}
      </Box>
      <Box minW={0}>
        <Text
          {...traceFieldLabelProps}
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
          <TraceReturnValues
            output={call.output}
            outputs={decoded.outputs}
            chainId={chainId}
            resolveAddresses={resolveAddresses}
          />
        ) : call.output === "0x" ? (
          <Text fontSize="xs" fontFamily="mono" color="text.secondary">
            0x
          </Text>
        ) : (
          <TraceData
            label={
              call.type.startsWith("CREATE")
                ? "Deployed bytecode"
                : "Return values"
            }
            hideLabel={!call.type.startsWith("CREATE")}
            value={call.output}
          />
        )}
      </Box>
    </Box>
  );
}
