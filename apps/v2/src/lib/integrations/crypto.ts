import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

const PREFIX = "enc:v1:";

function loadKey(raw: string | undefined, label: string): Buffer | null {
  if (!raw) return null;
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) throw new Error(`${label} must decode to 32 bytes`);
  return buf;
}

function primaryKey(): Buffer {
  const key = loadKey(process.env.INTEGRATIONS_ENC_KEY, "INTEGRATIONS_ENC_KEY");
  if (!key) throw new Error("INTEGRATIONS_ENC_KEY is not set");
  return key;
}

function decryptKeys(): Buffer[] {
  const keys = [primaryKey()];
  const old = loadKey(
    process.env.INTEGRATIONS_ENC_KEY_OLD,
    "INTEGRATIONS_ENC_KEY_OLD",
  );
  if (old) keys.push(old);
  return keys;
}

export function encryptSecret(plain: string, aad: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", primaryKey(), iv);
  cipher.setAAD(Buffer.from(aad, "utf8"));
  const ciphertext = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
}

export function decryptSecret(stored: string, aad: string): string {
  if (!stored.startsWith(PREFIX)) {
    throw new Error("Integration secret is not encrypted");
  }
  const [ivB64, tagB64, ctB64] = stored.slice(PREFIX.length).split(":");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ciphertext = Buffer.from(ctB64, "base64");
  const aadBuf = Buffer.from(aad, "utf8");

  let lastError: unknown;
  for (const key of decryptKeys()) {
    try {
      const decipher = createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAAD(aadBuf);
      decipher.setAuthTag(tag);
      return Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]).toString("utf8");
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error("Failed to decrypt integration secret", { cause: lastError });
}
