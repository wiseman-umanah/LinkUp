import { createCustodialWallet } from "../lib/hashgraph.js";
import { encryptSecret } from "../utils/encryption.js";

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
