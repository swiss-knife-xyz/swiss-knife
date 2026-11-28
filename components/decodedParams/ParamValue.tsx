import type { Arg } from "@/types";
import { AddressParam, IntParam, StringParam, UintParam } from "./index";
import { TreeBytesParam } from "./TreeBytesParam";

/** Shared leaf dispatcher. Containers own tree layout; values own their controls. */
export function ParamValue({
  arg,
  chainId,
  inlinePreview,
  resolveAddressMetadata = true,
  rawUnitLabel,
}: {
  arg: Arg;
  chainId?: number;
  inlinePreview?: boolean;
  resolveAddressMetadata?: boolean;
  rawUnitLabel?: string;
}) {
  const type = arg.baseType;
  if (type === "address")
    return (
      <AddressParam
        address={arg.value}
        chainId={chainId}
        showLink
        resolveMetadata={resolveAddressMetadata}
      />
    );
  if (type.startsWith("uint"))
    return <UintParam value={arg.value} rawUnitLabel={rawUnitLabel} />;
  if (type.startsWith("int"))
    return <IntParam value={arg.value} rawUnitLabel={rawUnitLabel} />;
  if (type.startsWith("bytes"))
    return (
      <TreeBytesParam
        arg={
          arg.value == null
            ? null
            : {
                rawValue: String(arg.rawValue ?? arg.value),
                value: { decoded: null },
              }
        }
      />
    );
  return (
    <StringParam
      value={arg.value == null ? null : String(arg.value)}
      chainId={chainId}
      inlinePreview={inlinePreview}
    />
  );
}
