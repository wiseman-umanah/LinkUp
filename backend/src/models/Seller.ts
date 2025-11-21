import mongoose, { Schema, type Document, type InferSchemaType } from "mongoose";

const encryptedSecretSchema = new Schema(
  {
    iv: { type: String, required: true },
    cipherText: { type: String, required: true },
    authTag: { type: String, required: true },
  },
  { _id: false }
);

const walletSchema = new Schema(
  {
    accountId: { type: String, required: true },
    publicKey: { type: String, required: true },
    privateKey: { type: encryptedSecretSchema, required: true },
    mnemonic: { type: encryptedSecretSchema, required: false },
    network: { type: String, required: true },
    seedRetrieved: { type: Boolean, default: false },
  },
  { _id: false }
);

const sellerSchema = new Schema(
  {
    businessName: { type: String, required: true },
    businessNameHash: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    country: { type: String, required: true },
    wallet: { type: walletSchema, required: false },
    verifiedAt: { type: Date },
  },
  { timestamps: true }
);

export type SellerDocument = Document & InferSchemaType<typeof sellerSchema>;

export const SellerModel = mongoose.model<SellerDocument>("Seller", sellerSchema);
