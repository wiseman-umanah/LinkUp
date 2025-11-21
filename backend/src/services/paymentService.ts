import { PaymentModel, type PaymentDocument } from "../models/Payment.js";
import { PaymentTransactionModel } from "../models/PaymentTransaction.js";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

const PLATFORM_FEE = env.PLATFORM_FEE_BPS / 10000;

export async function listPayments(params: { sellerId: string; limit?: number; offset?: number }) {
  const limit = Math.min(params.limit ?? 20, 100);
  const offset = params.offset ?? 0;
  const [items, count] = await Promise.all([
    PaymentModel.find({ sellerId: params.sellerId })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean()
      .exec(),
    PaymentModel.countDocuments({ sellerId: params.sellerId }),
  ]);
  return {
    items: items.map(serializePayment),
    pagination: { limit, offset, count },
  };
}

export async function createPaymentLink(params: {
  sellerId: string;
  sellerAddress?: string | null;
  name: string;
  description?: string | null;
  priceHbar: number;
  priceUSD?: number | null;
  customSuccessMessage?: string | null;
  redirectUrl?: string | null;
  slug: string;
  imageBase64?: string | null;
  blockchainTxId?: string | null;
}) {
  const existing = await PaymentModel.findOne({ paymentLink: params.slug });
  if (existing) {
    const error: any = new Error("Payment link already exists");
    error.status = 409;
    throw error;
  }

  const feeHbar = Number((params.priceHbar * PLATFORM_FEE).toFixed(8));
  const totalHbar = Number((params.priceHbar + feeHbar).toFixed(8));

  const payment = await PaymentModel.create({
    sellerId: params.sellerId,
    name: params.name,
    description: params.description,
    customSuccessMessage: params.customSuccessMessage,
    redirectUrl: params.redirectUrl,
    priceHbar: params.priceHbar,
    priceUSD: params.priceUSD ?? null,
    feeHbar,
    totalHbar,
    paymentLink: params.slug,
    image: params.imageBase64 ?? null,
    blockchainCreateTx: params.blockchainTxId ?? null,
    sellerAddress: params.sellerAddress ?? null,
  });

  if (params.blockchainTxId) {
    await PaymentTransactionModel.create({
      sellerId: params.sellerId,
      paymentId: payment._id,
      paymentName: params.name,
      paymentSlug: params.slug,
      txId: params.blockchainTxId,
      kind: "create",
    });
  }

  return serializePayment(payment);
}

export async function findSellerPayment(params: { sellerId: string; paymentId: string }) {
  return PaymentModel.findOne({ _id: params.paymentId, sellerId: params.sellerId });
}

export async function deactivatePaymentLink(params: {
  payment: PaymentDocument;
  blockchainTxId?: string;
}) {
  const payment = params.payment;
  payment.status = "inactive";
  payment.blockchainDeactivateTx = params.blockchainTxId ?? payment.blockchainDeactivateTx ?? null;
  await payment.save();

  if (params.blockchainTxId) {
    await PaymentTransactionModel.create({
      sellerId: payment.sellerId,
      paymentId: payment._id,
      paymentName: payment.name,
      paymentSlug: payment.paymentLink,
      txId: params.blockchainTxId,
      kind: "deactivate",
    });
  }

  return serializePayment(payment);
}

export async function recordPublicPaymentTx(params: {
  paymentId: string;
  txId: string;
  kind: "payment";
  payerAddress?: string | null;
}) {
  const payment = await PaymentModel.findById(params.paymentId);
  if (!payment) return null;
  await PaymentTransactionModel.create({
    sellerId: payment.sellerId,
    paymentId: payment._id,
    paymentName: payment.name,
    paymentSlug: payment.paymentLink,
    txId: params.txId,
    payerAddress: params.payerAddress ?? null,
    kind: params.kind,
  });
  return true;
}

export async function listTransactions(params: { sellerId: string; limit?: number; offset?: number }) {
  const limit = Math.min(params.limit ?? 20, 100);
  const offset = params.offset ?? 0;
  const [items, count] = await Promise.all([
    PaymentTransactionModel.find({ sellerId: params.sellerId })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean()
      .exec(),
    PaymentTransactionModel.countDocuments({ sellerId: params.sellerId }),
  ]);

  return {
    items: items.map((item) => ({
      id: item._id.toString(),
      paymentId: item.paymentId.toString(),
      paymentName: item.paymentName ?? null,
      paymentSlug: item.paymentSlug ?? null,
      txId: item.txId,
      kind: item.kind,
      payerAddress: item.payerAddress ?? null,
      createdAt: item.createdAt,
    })),
    pagination: { limit, offset, count },
  };
}

export async function getPublicPayment(slug: string) {
  const payment = await PaymentModel.findOne({ paymentLink: slug, status: "active" }).lean();
  if (!payment) return null;
  return serializePayment(payment);
}

function serializePayment(payment: any) {
  const doc = payment?.toObject ? payment.toObject() : payment;
  return {
    id: doc._id.toString(),
    name: doc.name,
    description: doc.description ?? null,
    customSuccessMessage: doc.customSuccessMessage ?? null,
    redirectUrl: doc.redirectUrl ?? null,
    priceHbar: doc.priceHbar,
    priceUSD: doc.priceUSD ?? null,
    feeHbar: doc.feeHbar,
    totalHbar: doc.totalHbar,
    paymentLink: doc.paymentLink,
    image: doc.image ?? null,
    imagePublicId: doc.imagePublicId ?? null,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    blockchainCreateTx: doc.blockchainCreateTx ?? null,
    blockchainDeactivateTx: doc.blockchainDeactivateTx ?? null,
    sellerAddress: doc.sellerAddress ?? null,
  };
}
