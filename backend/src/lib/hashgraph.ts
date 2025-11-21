import {
  AccountCreateTransaction,
  AccountId,
  Client,
  Hbar,
  Mnemonic,
  PrivateKey,
} from "@hashgraph/sdk";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

let cachedClient: Client | null = null;

function requireOperator(): Client | null {
  if (!env.HEDERA_OPERATOR_ID || !env.HEDERA_OPERATOR_KEY) {
    logger.warn("Hedera operator not configured; running in stub mode");
    return null;
  }
  if (cachedClient) return cachedClient;
  cachedClient = createClientForNetwork(env.HEDERA_NETWORK);
  const operatorKey = parseOperatorKey(env.HEDERA_OPERATOR_KEY, env.HEDERA_KEY_TYPE);
  cachedClient.setOperator(AccountId.fromString(env.HEDERA_OPERATOR_ID), operatorKey);
  return cachedClient;
}

export type WalletRecord = {
  accountId: string;
  privateKey: string;
  publicKey: string;
  mnemonic?: string;
  network: string;
};

export async function createCustodialWallet(): Promise<WalletRecord> {
  const operator = requireOperator();
  const mnemonic = await Mnemonic.generate();
  const privateKey =
    env.HEDERA_KEY_TYPE === "ECDSA"
      ? await mnemonic.toEcdsaPrivateKey()
      : await mnemonic.toPrivateKey();
  const publicKey = privateKey.publicKey;

  if (!operator) {
    return {
      accountId: `0.0.${Math.floor(Math.random() * 1_000_000)}`,
      privateKey: privateKey.toStringRaw(),
      publicKey: publicKey.toStringRaw(),
      network: env.HEDERA_NETWORK,
      mnemonic: mnemonic.toString(),
    };
  }

  const tx = await new AccountCreateTransaction()
    .setKey(publicKey)
    .setInitialBalance(new Hbar(env.HEDERA_INITIAL_BALANCE_HBAR))
    .execute(operator);

  const receipt = await tx.getReceipt(operator);
  const accountId = receipt.accountId?.toString() ?? "unknown";

  return {
    accountId,
    privateKey: privateKey.toStringRaw(),
    publicKey: publicKey.toStringRaw(),
    network: env.HEDERA_NETWORK,
    mnemonic: mnemonic.toString(),
  };
}

function createClientForNetwork(network: string): Client {
  switch (network) {
    case "mainnet":
      return Client.forMainnet();
    case "previewnet":
      return Client.forPreviewnet();
    default:
      return Client.forTestnet();
  }
}

function parseOperatorKey(key: string, keyType: string): PrivateKey {
  try {
    if (keyType === "ECDSA") {
      return PrivateKey.fromStringECDSA(key);
    }
    return PrivateKey.fromString(key);
  } catch (err) {
    logger.error("Failed to parse Hedera operator key", err);
    throw err;
  }
}
