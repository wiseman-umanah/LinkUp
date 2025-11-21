import mongoose, { Schema, type Document, type InferSchemaType } from "mongoose";

const paymentTransactionSchema = new Schema(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: "Seller", required: true, index: true },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment", required: true, index: true },
    paymentName: { type: String },
    paymentSlug: { type: String },
    txId: { type: String, required: true },
    kind: { type: String, enum: ["create", "payment", "deactivate"], required: true },
    payerAddress: { type: String },
  },
  { timestamps: true }
);

export type PaymentTransactionDocument = Document & InferSchemaType<typeof paymentTransactionSchema>;

export const PaymentTransactionModel = mongoose.model<PaymentTransactionDocument>(
  "PaymentTransaction",
  paymentTransactionSchema
);
