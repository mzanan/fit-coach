import { IMAGE_MAX_DIMENSION } from "@/lib/constants";

const QUALITY = 0.85;
const API_SAFE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type Decoded = { source: CanvasImageSource; width: number; height: number };

function decodeViaElement(file: File): Promise<Decoded> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ source: img, width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("undecodable"));
    };
    img.src = url;
  });
}

async function decode(file: File): Promise<Decoded> {
  try {
    const bitmap = await createImageBitmap(file);
    return { source: bitmap, width: bitmap.width, height: bitmap.height };
  } catch {
    return decodeViaElement(file);
  }
}

export async function compressImage(file: File): Promise<Blob> {
  let decoded: Decoded;
  try {
    decoded = await decode(file);
  } catch {
    return file;
  }

  const { source, width, height } = decoded;
  const scale = Math.min(1, IMAGE_MAX_DIMENSION / Math.max(width, height));
  const apiSafe = API_SAFE_TYPES.includes(file.type);
  if (apiSafe && scale === 1 && file.size < 2 * 1024 * 1024) return file;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob ?? file), "image/jpeg", QUALITY),
  );
}
