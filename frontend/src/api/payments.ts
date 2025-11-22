import { api } from "./client";

export type PaymentRecord = {
  id: string;
  name: string;
  image: string | null;
  description: string | null;
  customSuccessMessage: string | null;
  redirectUrl: string | null;
  priceHbar: number;
  priceUSD: number | null;
  feeHbar: number;
  totalHbar: number;
  paymentLink: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  blockchainCreateTx?: string | null;
  blockchainDeactivateTx?: string | null;
  imagePublicId?: string | null;
  sellerAddress?: string | null;
};

export type TransactionRecord = {
  id: string;
  paymentId: string;
  paymentName: string | null;
  paymentSlug: string | null;
  txId: string;
  kind: string;
  payerAddress: string | null;
  createdAt: string;
};

export type PaymentListResponse = {
  items: PaymentRecord[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
  };
};

export async function listPayments(params: { limit?: number; offset?: number } = {}) {
  try {
    const { data } = await api.get<PaymentListResponse>("/payments", { params });
    return data;
  } catch (err) {
    console.error("listPayments error:", err);
    throw err;
  }
}

export async function createPayment(payload: {
  name: string;
  description?: string;
  priceHbar: number;
  priceUSD?: number | null;
  customSuccessMessage?: string;
  redirectUrl?: string | null;
  imageBase64?: string | null;
  imageMimeType?: string | null;
  slug: string;
}) {
  const { data } = await api.post<{ payment: PaymentRecord }>("/payments", payload);
  return data.payment;
}

export async function deletePayment(id: string) {
  const { data } = await api.delete<{ payment: PaymentRecord }>(`/payments/${id}`);
  return data.payment;
}

export async function listTransactions(params: { limit?: number; offset?: number } = {}) {
  const { data } = await api.get<{ items: TransactionRecord[]; pagination: unknown }>("/transactions", {
    params,
  });
  return data;
}

export async function recordPaymentTransaction(
  paymentId: string,
  txId: string,
  kind: string,
  payerAddress?: string | null
) {
  const { data } = await api.post<{ transaction: unknown }>(
    `/public/payments/${paymentId}/transactions`,
    {
      txId,
      kind,
      payerAddress,
    }
  );
  return data.transaction;
}

export async function fetchPublicPayment(slug: string) {
  const { data } = await api.get<{ payment: PaymentRecord }>(`/public/payments/${slug}`);
  return data.payment;
}
