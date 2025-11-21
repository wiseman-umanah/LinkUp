import mongoose, { Schema, type Document, type InferSchemaType } from "mongoose";

const sessionSchema = new Schema(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: "Seller", required: true },
    refreshTokenHash: { type: String, required: true },
    userAgent: { type: String },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

export type SessionDocument = Document & InferSchemaType<typeof sessionSchema>;

export const SessionModel = mongoose.model<SessionDocument>("Session", sessionSchema);
