import "server-only";

import jpeg from "jpeg-js";

import { IMAGE_MAX_DIMENSION } from "@/lib/constants";

const QUALITY = 82;
const HEIC_TYPES = ["image/heic", "image/heif", "image/heic-sequence"];

function isHeic(type: string, name: string): boolean {
  return (
    HEIC_TYPES.includes(type.toLowerCase()) || /\.hei[cf]$/i.test(name) || type === ""
  );
}

function boxResize(
  src: Uint8Array | Buffer,
  sw: number,
  sh: number,
  dw: number,
  dh: number,
): Buffer {
  const out = Buffer.alloc(dw * dh * 4);
  const xRatio = sw / dw;
  const yRatio = sh / dh;

  for (let y = 0; y < dh; y++) {
    const y0 = Math.floor(y * yRatio);
    const y1 = Math.min(sh, Math.max(y0 + 1, Math.ceil((y + 1) * yRatio)));
    for (let x = 0; x < dw; x++) {
      const x0 = Math.floor(x * xRatio);
      const x1 = Math.min(sw, Math.max(x0 + 1, Math.ceil((x + 1) * xRatio)));
      let r = 0;
      let g = 0;
      let b = 0;
      let count = 0;
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * sw + xx) * 4;
          r += src[i];
          g += src[i + 1];
          b += src[i + 2];
          count++;
        }
      }
      const o = (y * dw + x) * 4;
      out[o] = r / count;
      out[o + 1] = g / count;
      out[o + 2] = b / count;
      out[o + 3] = 255;
    }
  }
  return out;
}

export async function toModelDataUrl(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (!isHeic(file.type, file.name)) {
    return `data:${file.type || "image/jpeg"};base64,${buffer.toString("base64")}`;
  }

  console.log("[inbody] decoding heic", buffer.length, "bytes");
  const { default: decode } = await import("heic-decode");
  const { width, height, data } = await decode({ buffer });
  console.log("[inbody] heic decoded", width, "x", height);
  const scale = Math.min(1, IMAGE_MAX_DIMENSION / Math.max(width, height));
  const dw = Math.max(1, Math.round(width * scale));
  const dh = Math.max(1, Math.round(height * scale));
  const pixels =
    scale === 1 ? Buffer.from(data) : boxResize(data, width, height, dw, dh);
  const { data: jpegData } = jpeg.encode(
    { data: pixels, width: dw, height: dh },
    QUALITY,
  );
  return `data:image/jpeg;base64,${jpegData.toString("base64")}`;
}
