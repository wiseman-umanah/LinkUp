import { api } from "./client";

export type ImportWalletResponse = {
  message: string;
  walletAccountId: string;
  walletNetwork: string | null;
};

export async function importWallet(params: { accountId: string; mnemonic: string }) {
  const { data } = await api.post<ImportWalletResponse>("/wallet/import", {
    accountId: params.accountId,
    mnemonic: params.mnemonic,
  });
  return data;
}
