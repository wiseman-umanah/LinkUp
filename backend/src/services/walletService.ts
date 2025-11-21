import { AccountInfoQuery, Hbar, Mnemonic } from "@hashgraph/sdk";
import { createCustodialWallet, buildClientForWallet } from "../lib/hashgraph.js";
import { encryptSecret, decryptSecret } from "../utils/encryption.js";
import type { SellerDocument } from "../models/Seller.js";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

export async function provisionWallet() {
  const wallet = await createCustodialWallet();
  return {
    encryptedWallet: {
      accountId: wallet.accountId,
      publicKey: wallet.publicKey,
      network: wallet.network,
      privateKey: encryptSecret(wallet.privateKey),
      mnemonic: wallet.mnemonic ? encryptSecret(wallet.mnemonic) : undefined,
      seedRetrieved: false,
    },
    seedPhrase: wallet.mnemonic ?? null,
  };
}

export function getSellerWalletCredentials(seller: SellerDocument) {
  if (!seller.wallet?.privateKey || !seller.wallet.accountId) {
    const error: any = new Error("Seller wallet is not provisioned");
    error.status = 400;
    throw error;
  }
  return {
    accountId: seller.wallet.accountId,
    privateKey: decryptSecret(seller.wallet.privateKey),
  };
}

export async function importWalletFromMnemonic(params: {
  seller: SellerDocument;
  mnemonic: string;
  accountId: string;
}) {
  const mnemonic = await Mnemonic.fromString(params.mnemonic.trim());
  const privateKey =
    env.HEDERA_KEY_TYPE === "ECDSA"
      ? await mnemonic.toEcdsaPrivateKey()
      : await mnemonic.toPrivateKey();
  await verifyAccountOwnership(params.accountId, privateKey);
  const wallet = {
    accountId: params.accountId,
    publicKey: privateKey.publicKey.toStringRaw(),
    network: env.HEDERA_NETWORK,
    privateKey: encryptSecret(privateKey.toStringRaw()),
    mnemonic: encryptSecret(mnemonic.toString()),
    seedRetrieved: true,
  };
  params.seller.wallet = wallet;
  await params.seller.save();
  return wallet;
}

async function verifyAccountOwnership(accountId: string, privateKey: any) {
  const client = buildClientForWallet(accountId, privateKey.toStringRaw());
  try {
    const info = await new AccountInfoQuery()
      .setAccountId(accountId)
      .setMaxQueryPayment(new Hbar(1))
      .execute(client);
    const onChainKey = info.key?.toString();
    const providedKey = privateKey.publicKey.toString();
    if (!onChainKey || onChainKey !== providedKey) {
      const error: any = new Error("Account ID does not match the provided mnemonic");
      error.status = 400;
      throw error;
    }
  } catch (err) {
    logger.error("Failed to verify wallet ownership", err);
    const handled: any = err;
    if (handled?.status) throw handled;
    const error: any = new Error("Account ID does not match the provided mnemonic");
    error.status = 400;
    throw error;
  } finally {
    client.close();
  }
}
