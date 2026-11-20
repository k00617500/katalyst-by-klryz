declare module "gifenc" {
  export interface GifWriteOptions {
    palette?: number[][];
    delay?: number;
    repeat?: number;
    transparent?: boolean;
  }
  export interface GifEncoderInstance {
    writeFrame(index: Uint8Array, width: number, height: number, options?: GifWriteOptions): void;
    finish(): void;
    bytes(): Uint8Array;
  }
  export function GIFEncoder(): GifEncoderInstance;
  export function quantize(data: Uint8Array | Uint8ClampedArray, maxColors: number, options?: { format?: string }): number[][];
  export function applyPalette(data: Uint8Array | Uint8ClampedArray, palette: number[][], format?: string): Uint8Array;
}
