declare module "content-hash" {
  export function decode(hash: string): string;
  export function encode(value: string, codec: string): string;
  export function getCodec(hash: string): string;
  export const helpers: {
    cidV0ToV1Base32(cid: string): string;
    cidV1ToV0(cid: string): string;
  };
}
