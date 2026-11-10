declare module "heic-decode" {
  interface DecodeResult {
    width: number;
    height: number;
    data: Uint8Array;
  }
  export default function decode(input: {
    buffer: Buffer | Uint8Array;
  }): Promise<DecodeResult>;
}
