import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { importWalletFromMnemonic } from "../services/walletService.js";

export const walletRouter = Router();

const importSchema = z.object({
  mnemonic: z.string().min(10),
  accountId: z.string().min(5),
});

walletRouter.post("/import", requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const body = importSchema.parse(req.body);
    const wallet = await importWalletFromMnemonic({
      seller: req.seller!,
      mnemonic: body.mnemonic,
      accountId: body.accountId,
    });
    res.json({
      message: "Wallet imported",
      walletAccountId: wallet.accountId,
      walletNetwork: wallet.network,
    });
  } catch (err) {
    next(err);
  }
});
