import bcrypt from "bcrypt";
import crypto from "crypto";
import { SellerModel, type SellerDocument } from "../models/Seller.js";

export function hashBusinessName(name: string) {
  return crypto.createHash("sha256").update(name.trim().toLowerCase()).digest("hex");
}

export async function findSellerByEmail(email: string) {
  return SellerModel.findOne({ email: email.toLowerCase() });
}

export async function findSellerByBusinessHash(hash: string) {
  return SellerModel.findOne({ businessNameHash: hash });
}

type EncryptedSecret = {
  iv: string;
  cipherText: string;
  authTag: string;
};

type EncryptedWallet = {
  accountId: string;
  publicKey: string;
  network: string;
  privateKey: EncryptedSecret;
  mnemonic?: EncryptedSecret;
  seedRetrieved?: boolean;
};

export async function createSeller(payload: {
  businessName: string;
  email: string;
  password: string;
  country: string;
  wallet?: EncryptedWallet;
}) {
  const passwordHash = await bcrypt.hash(payload.password, 12);
  const businessNameHash = hashBusinessName(payload.businessName);

  const seller = await SellerModel.create({
    businessName: payload.businessName,
    businessNameHash,
    email: payload.email.toLowerCase(),
    passwordHash,
    country: payload.country,
    wallet: payload.wallet,
  });

  return seller;
}

export function serializeSeller(seller: SellerDocument) {
  return {
    id: seller._id.toString(),
    businessName: seller.businessName,
    email: seller.email,
    country: seller.country,
    walletAccountId: seller.wallet?.accountId ?? null,
    walletNetwork: seller.wallet?.network ?? null,
    verifiedAt: seller.verifiedAt ?? null,
    createdAt: seller.createdAt,
    updatedAt: seller.updatedAt,
  };
}

export async function markSellerVerified(id: string | SellerDocument["_id"]) {
  return SellerModel.findByIdAndUpdate(id, { verifiedAt: new Date() }, { new: true });
}

export async function verifyPassword(seller: SellerDocument, password: string) {
  return bcrypt.compare(password, seller.passwordHash);
}

export async function updatePassword(id: string | SellerDocument["_id"], newPassword: string) {
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await SellerModel.findByIdAndUpdate(id, { passwordHash });
}
