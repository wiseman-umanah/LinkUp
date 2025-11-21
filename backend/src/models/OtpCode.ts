import mongoose, { Schema, type Document, type InferSchemaType } from "mongoose";

const otpSchema = new Schema(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: "Seller", required: true },
    email: { type: String, required: true, index: true },
    purpose: { type: String, required: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true }
);

otpSchema.index({ email: 1, purpose: 1 });

export type OtpCodeDocument = Document & InferSchemaType<typeof otpSchema>;

export const OtpCodeModel = mongoose.model<OtpCodeDocument>("OtpCode", otpSchema);
