import bcrypt from "bcrypt";
import crypto from "crypto";
import { env } from "../config/env.js";

export type OtpPayload = {
  codeHash: string;
  expiresAt: Date;
  code: string;
};

export function createOtp(): OtpPayload {
  const code = generateNumericCode(env.OTP_LENGTH);
  const salt = bcrypt.genSaltSync(10);
  const codeHash = bcrypt.hashSync(code, salt);
  const expiresAt = new Date(Date.now() + env.OTP_EXP_MINUTES * 60 * 1000);
  return { code, codeHash, expiresAt };
}

export function verifyOtpCode(code: string, hash: string) {
  return bcrypt.compare(code, hash);
}

function generateNumericCode(length: number) {
  return Array.from({ length }, () => crypto.randomInt(0, 10)).join("");
}
