import { OtpCodeModel } from "../models/OtpCode.js";
import { createOtp, verifyOtpCode } from "../utils/otp.js";

export const OTP_PURPOSES = {
  SIGNUP: "signup",
  LOGIN: "login",
  RESET: "password-reset",
} as const;

export async function createOtpCode(params: { sellerId: string; email: string; purpose: string }) {
  const { code, codeHash, expiresAt } = createOtp();
  await OtpCodeModel.create({
    sellerId: params.sellerId,
    email: params.email.toLowerCase(),
    purpose: params.purpose,
    codeHash,
    expiresAt,
  });
  return { code, expiresAt };
}

export async function verifyOtpEntry(params: { email: string; purpose: string; code: string }) {
  const record = await OtpCodeModel.findOne({
    email: params.email.toLowerCase(),
    purpose: params.purpose,
  })
    .sort({ createdAt: -1 })
    .exec();

  if (!record) return { valid: false, reason: "OTP not found" };
  if (record.expiresAt.getTime() < Date.now()) {
    return { valid: false, reason: "OTP expired" };
  }

  const ok = await verifyOtpCode(params.code, record.codeHash);
  if (!ok) return { valid: false, reason: "OTP invalid" };

  await record.deleteOne();
  return { valid: true };
}
