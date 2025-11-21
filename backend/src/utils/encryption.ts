import crypto from "crypto";
import { env } from "../config/env.js";

const key = crypto.createHash("sha256").update(env.ENCRYPTION_KEY).digest();

export function encryptSecret(plainText: string): { iv: string; cipherText: string; authTag: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    iv: iv.toString("base64"),
    cipherText: encrypted.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decryptSecret(payload: { iv: string; cipherText: string; authTag: string }): string {
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.cipherText, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
