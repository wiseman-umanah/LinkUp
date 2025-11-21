import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import {
  createPaymentLink,
  deactivatePaymentLink,
  findSellerPayment,
  getPublicPayment,
  listPayments,
  listTransactions,
  recordPublicPaymentTx,
} from "../services/paymentService.js";
import {
  submitCreatePaymentOnChain,
  submitDeactivatePaymentOnChain,
} from "../services/linkupContractService.js";

export const paymentsRouter = Router();
export const publicPaymentsRouter = Router();
export const transactionsRouter = Router();

const createPaymentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  priceHbar: z.number().or(z.string()).transform((val) => Number(val)).refine((val) => val > 0),
  priceUSD: z.number().nullable().optional(),
  customSuccessMessage: z.string().optional(),
  redirectUrl: z.string().url().optional(),
  slug: z.string().min(4),
  imageBase64: z.string().optional(),
});

paymentsRouter.get("/", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await listPayments({
      sellerId: req.seller!._id.toString(),
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      offset: req.query.offset ? Number(req.query.offset) : undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

paymentsRouter.post("/", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const body = createPaymentSchema.parse(req.body);
    const seller = req.seller!;
    let blockchainTxId: string | null = null;
    if (seller.wallet?.accountId) {
      blockchainTxId = await submitCreatePaymentOnChain({
        seller,
        slug: body.slug,
        amountHbar: body.priceHbar,
      });
    }
    const payment = await createPaymentLink({
      sellerId: seller._id.toString(),
      sellerAddress: seller.wallet?.accountId ?? null,
      name: body.name,
      description: body.description,
      priceHbar: body.priceHbar,
      priceUSD: body.priceUSD ?? null,
      customSuccessMessage: body.customSuccessMessage,
      redirectUrl: body.redirectUrl,
      slug: body.slug,
      imageBase64: body.imageBase64,
      blockchainTxId,
    });
    res.status(201).json({ payment });
  } catch (err) {
    next(err);
  }
});

paymentsRouter.delete("/:id", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const seller = req.seller!;
    const existing = await findSellerPayment({
      sellerId: seller._id.toString(),
      paymentId: req.params.id,
    });
    if (!existing) return res.status(404).json({ error: "Payment not found" });

    let blockchainTxId: string | undefined;
    if (seller.wallet?.accountId) {
      blockchainTxId = await submitDeactivatePaymentOnChain({
        seller,
        slug: existing.paymentLink,
      });
    }
    const payment = await deactivatePaymentLink({
      payment: existing,
      blockchainTxId,
    });
    res.json({ payment });
  } catch (err) {
    next(err);
  }
});

publicPaymentsRouter.get("/:slug", async (req, res, next) => {
  try {
    const payment = await getPublicPayment(req.params.slug);
    if (!payment) return res.status(404).json({ error: "Payment not found" });
    res.json({ payment });
  } catch (err) {
    next(err);
  }
});

publicPaymentsRouter.post("/:id/transactions", async (req, res, next) => {
  try {
    const schema = z.object({
      txId: z.string().min(4),
      kind: z.enum(["payment"]),
      payerAddress: z.string().optional(),
    });
    const body = schema.parse(req.body);
    const ok = await recordPublicPaymentTx({
      paymentId: req.params.id,
      txId: body.txId,
      kind: body.kind,
      payerAddress: body.payerAddress,
    });
    if (!ok) return res.status(404).json({ error: "Payment not found" });
    res.json({ message: "Recorded" });
  } catch (err) {
    next(err);
  }
});

transactionsRouter.get("/", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await listTransactions({
      sellerId: req.seller!._id.toString(),
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      offset: req.query.offset ? Number(req.query.offset) : undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});
