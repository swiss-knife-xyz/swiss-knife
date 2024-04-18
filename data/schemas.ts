import { z } from "zod";

export const calldataDecoderRequestSchema = z.object({
  calldata: z.string(),
  address: z
    .string()
    .length(42, "Address must be 42 characters long")
    .optional(),
  chainId: z.number().int().positive().optional(),
});

export const calldataDecoderRecursiveRequestSchema = z.object({
  calldata: z.string().optional(),
  address: z
    .string()
    .length(42, "Address must be 42 characters long")
    .optional(),
  chainId: z.number().int().positive().optional(),
  tx: z.string().optional(),
});

export type CalldataDecoderRequest = z.infer<
  typeof calldataDecoderRequestSchema
>;

export type CalldataDecoderRecursiveRequest = z.infer<
  typeof calldataDecoderRecursiveRequestSchema
>;

export const calldataDecoderResponseSchema = z.object({
  functionName: z.string(),
  params: z
    .array(
      z.object({
        name: z.string().optional(),
        type: z.string(),
        value: z.string(),
      })
    )
    .optional(),
});

export type CalldataDecoderResponse = z.infer<
  typeof calldataDecoderResponseSchema
>;

export const fetchContractAbiResponseSchema = z.object({
  abi: z.array(z.unknown()),
  name: z.string(),
});

export type FetchContractAbiResponse = z.infer<
  typeof fetchContractAbiResponseSchema
>;

export const fetchFunctionInterfaceOpenApiSchema = z.object({
  ok: z.boolean(),
  result: z.object({
    function: z.record(
      z
        .array(
          z.object({
            name: z.string(),
            filtered: z.boolean(),
          })
        )
        .optional()
    ),
    event: z.record(
      z
        .array(
          z.object({
            name: z.string(),
            filtered: z.boolean(),
          })
        )
        .optional()
    ),
  }),
});

export type FetchFunctionInterfaceOpenApi = z.infer<
  typeof fetchFunctionInterfaceOpenApiSchema
>;

export const fetchFunctionInterface4ByteSchema = z.object({
  count: z.number(),
  results: z.array(
    z.object({
      id: z.number(),
      created_at: z.string(),
      text_signature: z.string(),
      hex_signature: z.string(),
    })
  ),
});

export type FetchFunctionInterface4Byte = z.infer<
  typeof fetchFunctionInterface4ByteSchema
>;
