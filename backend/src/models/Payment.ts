import mongoose, { Schema, type Document, type InferSchemaType } from "mongoose";

const paymentSchema = new Schema(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: "Seller", required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    customSuccessMessage: { type: String },
    redirectUrl: { type: String },
    image: { type: String },
    imagePublicId: { type: String },
    priceHbar: { type: Number, required: true },
    priceUSD: { type: Number },
    feeHbar: { type: Number, required: true },
    totalHbar: { type: Number, required: true },
    paymentLink: { type: String, required: true, unique: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    blockchainCreateTx: { type: String },
    blockchainDeactivateTx: { type: String },
    sellerAddress: { type: String },
  },
  { timestamps: true }
);

paymentSchema.index({ sellerId: 1, paymentLink: 1 }, { unique: true });

export type PaymentDocument = Document & InferSchemaType<typeof paymentSchema>;

export const PaymentModel = mongoose.model<PaymentDocument>("Payment", paymentSchema);
