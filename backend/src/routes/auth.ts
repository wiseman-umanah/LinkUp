import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { findSellerByEmail, findSellerByBusinessHash, createSeller, markSellerVerified, serializeSeller, verifyPassword, updatePassword, hashBusinessName } from "../services/sellerService.js";
import { provisionWallet } from "../services/walletService.js";
import { OTP_PURPOSES, createOtpCode, verifyOtpEntry } from "../services/otpService.js";
import { sendOtpEmail } from "../services/emailService.js";
import { startSession, rotateSession, revokeSession } from "../services/sessionService.js";
import { decryptSecret } from "../utils/encryption.js";

export const authRouter = Router();

const signupSchema = z.object({
  businessName: z.string().min(3).max(80),
  email: z.string().email(),
  password: z.string().min(8),
  country: z.string().min(2).max(60),
});

authRouter.post("/signup", async (req, res, next) => {
  try {
    const body = signupSchema.parse(req.body);
    const email = body.email.toLowerCase();
    const existingEmail = await findSellerByEmail(email);
    if (existingEmail) {
      return res.status(existingEmail.verifiedAt ? 409 : 202).json({ message: "Account already exists. Please verify via OTP." });
    }
    const existingBusiness = await findSellerByBusinessHash(hashBusinessName(body.businessName));
    if (existingBusiness) {
      return res.status(409).json({ error: "Business name unavailable" });
    }

    const { encryptedWallet } = await provisionWallet();
    const seller = await createSeller({
      businessName: body.businessName,
      email,
      password: body.password,
      country: body.country,
      wallet: encryptedWallet,
    });

    const { code, expiresAt } = await createOtpCode({
      sellerId: seller._id.toString(),
      email,
      purpose: OTP_PURPOSES.SIGNUP,
    });
    await sendOtpEmail(email, code, "signup");

    res.status(201).json({
      message: "Signup initiated. Enter the OTP sent to your email.",
      otpExpiresAt: expiresAt,
    });
  } catch (err) {
    next(err);
  }
});

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().min(4),
});

authRouter.post("/signup/verify", async (req, res, next) => {
  try {
    const body = verifySchema.parse(req.body);
    const seller = await findSellerByEmail(body.email.toLowerCase());
    if (!seller) return res.status(404).json({ error: "Seller not found" });

    const result = await verifyOtpEntry({
      email: body.email.toLowerCase(),
      purpose: OTP_PURPOSES.SIGNUP,
      code: body.code,
    });
    if (!result.valid) return res.status(400).json({ error: result.reason });

    let verifiedSeller = seller;
    if (!seller.verifiedAt) {
      const updated = await markSellerVerified(seller._id);
      if (updated) verifiedSeller = updated;
    }

    const tokens = await startSession({ sellerId: seller._id.toString(), userAgent: req.headers["user-agent"] as string | undefined });

    let walletSeedPhrase: string | null = null;
    if (verifiedSeller.wallet?.mnemonic) {
      walletSeedPhrase = decryptSecret(verifiedSeller.wallet.mnemonic);
    }

    res.json({
      message: "Signup verified",
      seller: serializeSeller(verifiedSeller),
      tokens,
      walletSeedPhrase,
    });
  } catch (err) {
    next(err);
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const seller = await findSellerByEmail(body.email.toLowerCase());
    if (!seller || !seller.verifiedAt) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await verifyPassword(seller, body.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const { code, expiresAt } = await createOtpCode({
      sellerId: seller._id.toString(),
      email: seller.email,
      purpose: OTP_PURPOSES.LOGIN,
    });
    await sendOtpEmail(seller.email, code, "login");

    res.json({ message: "OTP sent to your email", otpExpiresAt: expiresAt });
  } catch (err) {
    next(err);
  }
});

const otpRequestSchema = z.object({
  email: z.string().email(),
});

authRouter.post("/login/otp/request", async (req, res, next) => {
  try {
    const body = otpRequestSchema.parse(req.body);
    const seller = await findSellerByEmail(body.email.toLowerCase());
    if (!seller || !seller.verifiedAt) return res.status(404).json({ error: "Seller not found" });
    const { code, expiresAt } = await createOtpCode({
      sellerId: seller._id.toString(),
      email: seller.email,
      purpose: OTP_PURPOSES.LOGIN,
    });
    await sendOtpEmail(seller.email, code, "login");
    res.json({ message: "OTP sent", otpExpiresAt: expiresAt });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/login/otp/verify", async (req, res, next) => {
  try {
    const body = verifySchema.parse(req.body);
    const seller = await findSellerByEmail(body.email.toLowerCase());
    if (!seller || !seller.verifiedAt) return res.status(404).json({ error: "Seller not found" });

    const result = await verifyOtpEntry({
      email: body.email.toLowerCase(),
      purpose: OTP_PURPOSES.LOGIN,
      code: body.code,
    });
    if (!result.valid) return res.status(400).json({ error: result.reason });

    const tokens = await startSession({ sellerId: seller._id.toString(), userAgent: req.headers["user-agent"] as string | undefined });

    res.json({
      message: "Login successful",
      seller: serializeSeller(seller),
      tokens,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/password/request", async (req, res, next) => {
  try {
    const body = otpRequestSchema.parse(req.body);
    const seller = await findSellerByEmail(body.email.toLowerCase());
    if (!seller) return res.status(404).json({ error: "Seller not found" });
    const { code, expiresAt } = await createOtpCode({
      sellerId: seller._id.toString(),
      email: seller.email,
      purpose: OTP_PURPOSES.RESET,
    });
    await sendOtpEmail(seller.email, code, "password reset");
    res.json({ message: "Password reset OTP sent", otpExpiresAt: expiresAt });
  } catch (err) {
    next(err);
  }
});

const resetSchema = z.object({
  email: z.string().email(),
  code: z.string().min(4),
  newPassword: z.string().min(8),
});

authRouter.post("/password/reset", async (req, res, next) => {
  try {
    const body = resetSchema.parse(req.body);
    const seller = await findSellerByEmail(body.email.toLowerCase());
    if (!seller) return res.status(404).json({ error: "Seller not found" });
    const result = await verifyOtpEntry({
      email: body.email.toLowerCase(),
      purpose: OTP_PURPOSES.RESET,
      code: body.code,
    });
    if (!result.valid) return res.status(400).json({ error: result.reason });
    await updatePassword(seller._id, body.newPassword);
    const tokens = await startSession({ sellerId: seller._id.toString(), userAgent: req.headers["user-agent"] as string | undefined });
    res.json({ message: "Password updated", seller: serializeSeller(seller), tokens });
  } catch (err) {
    next(err);
  }
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

authRouter.post("/refresh", async (req, res, next) => {
  try {
    const body = refreshSchema.parse(req.body);
    const tokens = await rotateSession(body.refreshToken);
    if (!tokens) return res.status(401).json({ error: "Invalid refresh token" });
    res.json({ tokens });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", async (req, res, next) => {
  try {
    const body = refreshSchema.parse(req.body);
    await revokeSession(body.refreshToken);
    res.json({ message: "Logged out" });
  } catch (err) {
    next(err);
  }
});
