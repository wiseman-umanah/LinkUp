import {
  ContractExecuteTransaction,
  ContractFunctionParameters,
  ContractId,
} from "@hashgraph/sdk";
import BigNumber from "bignumber.js";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import type { SellerDocument } from "../models/Seller.js";
import { buildClientForWallet } from "../lib/hashgraph.js";
import { getSellerWalletCredentials } from "./walletService.js";

const contractId = env.HEDERA_LINKUP_CONTRACT_ID
  ? ContractId.fromString(env.HEDERA_LINKUP_CONTRACT_ID)
  : null;

function ensureContract() {
  if (!contractId) {
    const error = new Error("HEDERA_LINKUP_CONTRACT_ID is not configured");
    // @ts-ignore add status
    error.status = 500;
    throw error;
  }
  return contractId;
}

const GAS_LIMIT = 500_000;
const WEI_FACTOR = new BigNumber("1e18");

export async function submitCreatePaymentOnChain(params: {
  seller: SellerDocument;
  slug: string;
  amountHbar: number;
}) {
  const contract = ensureContract();
  const credentials = getSellerWalletCredentials(params.seller);
  const client = buildClientForWallet(credentials.accountId, credentials.privateKey);

  try {
    const weiAmount = hbarToWei(params.amountHbar);
    const tx = await new ContractExecuteTransaction()
      .setContractId(contract)
      .setGas(GAS_LIMIT)
      .setFunction(
        "createPayment",
        new ContractFunctionParameters().addString(params.slug).addUint256(weiAmount)
      )
      .execute(client);
    await tx.getReceipt(client);
    return tx.transactionId.toString();
  } catch (err) {
    logger.error("Failed to submit createPayment transaction", err);
    const error: any = new Error("Unable to create payment on-chain");
    error.status = 502;
    throw error;
  } finally {
    client.close();
  }
}

function hbarToWei(amount: number): BigNumber {
  return new BigNumber(amount).multipliedBy(WEI_FACTOR).integerValue(BigNumber.ROUND_HALF_UP);
}

export async function submitDeactivatePaymentOnChain(params: {
  seller: SellerDocument;
  slug: string;
}) {
  const contract = ensureContract();
  const credentials = getSellerWalletCredentials(params.seller);
  const client = buildClientForWallet(credentials.accountId, credentials.privateKey);

  try {
    const tx = await new ContractExecuteTransaction()
      .setContractId(contract)
      .setGas(GAS_LIMIT)
      .setFunction("deactivatePayment", new ContractFunctionParameters().addString(params.slug))
      .execute(client);
    await tx.getReceipt(client);
    return tx.transactionId.toString();
  } catch (err) {
    logger.error("Failed to submit deactivatePayment transaction", err);
    const error: any = new Error("Unable to deactivate payment on-chain");
    error.status = 502;
    throw error;
  } finally {
    client.close();
  }
}
