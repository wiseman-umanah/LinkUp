import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  fetchPublicPayment,
  recordPaymentTransaction,
  type PaymentRecord,
} from "../api/payments";
import { Seo } from "../components/Seo";
import QrShareModal from "../components/QrShareModal";
import { useHashConnect } from "../hooks/useHashConnect";
import {
  AccountId,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  ContractId,
  Hbar,
  TransactionId,
} from "@hashgraph/sdk";

type PaymentItem = {
  recordId: string;
  id: string;
  name: string;
  description?: string;
  amountHbar: number;
  imageUrl?: string | null;
  feeHbar: number;
  totalHbar: number;
  successMessage?: string | null;
  redirectUrl?: string | null;
  priceUsd?: number | null;
};

const HEDERA_NETWORK = (import.meta.env.VITE_HEDERA_NETWORK ?? "testnet").toLowerCase();
const HASHSCAN_BASE =
  HEDERA_NETWORK === "mainnet"
    ? "https://hashscan.io/mainnet/transaction/"
    : HEDERA_NETWORK === "previewnet"
      ? "https://hashscan.io/previewnet/transaction/"
      : "https://hashscan.io/testnet/transaction/";
const CONTRACT_ID_ENV = import.meta.env.VITE_LINKUP_CONTRACT_ID;
const CONTRACT_SOLIDITY_ADDRESS = import.meta.env.VITE_LINKUP_CONTRACT_ADDRESS;
const DEFAULT_NODE_ACCOUNTS: Record<string, string[]> = {
  mainnet: ["0.0.3", "0.0.4", "0.0.5", "0.0.6"],
  testnet: ["0.0.3", "0.0.4", "0.0.5", "0.0.6"],
  previewnet: ["0.0.3", "0.0.4", "0.0.5"],
  devnet: ["0.0.3"],
};

function resolveContractId(): ContractId | null {
  if (CONTRACT_ID_ENV) {
    try {
      return ContractId.fromString(CONTRACT_ID_ENV);
    } catch (err) {
      console.warn("Invalid contract ID string", err);
    }
  }
  if (CONTRACT_SOLIDITY_ADDRESS) {
    try {
      const normalized = CONTRACT_SOLIDITY_ADDRESS.replace(/^0x/, "");
      return ContractId.fromSolidityAddress(normalized);
    } catch (err) {
      console.warn("Invalid contract solidity address", err);
    }
  }
  return null;
}

export default function PublicPaymentPage() {
  const [item, setItem] = useState<PaymentItem | null>(null);
  const [imageVisible, setImageVisible] = useState(true);
  const [loadingPay, setLoadingPay] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const { slug } = useParams<{ slug: string }>();
  const contractId = useMemo(() => resolveContractId(), []);

  const {
    accountId: buyerAccountId,
    pairingUri,
    status: walletStatus,
    connect,
    connectWithQr,
    clearPairingUri,
    disconnect,
    submitTransaction,
  } = useHashConnect();
  const walletConnected = Boolean(buyerAccountId);
  const [shareOpen, setShareOpen] = useState(false);
  const [pairingModalOpen, setPairingModalOpen] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  useEffect(() => {
    async function loadPayment() {
      if (!slug) {
        setError("Missing payment link.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const payment = await fetchPublicPayment(slug);
        setItem(mapPayment(payment));
      } catch (err: any) {
        setError(err?.response?.data?.error ?? "Payment link not found or inactive.");
      } finally {
        setLoading(false);
      }
    }

    loadPayment();
  }, [slug]);

  const { feeHbar, totalHbar } = useMemo(() => {
    if (!item) return { feeHbar: 0, totalHbar: 0 };
    return {
      feeHbar: round4(item.feeHbar),
      totalHbar: round4(item.totalHbar),
    };
  }, [item]);
  const appUrl =
    import.meta.env.VITE_APP_URL ??
    (typeof window !== "undefined" ? window.location.origin : "https://linkup.example");
  const canonicalUrl = useMemo(
    () => `${appUrl.replace(/\/$/, "")}/payment/${slug ?? ""}`,
    [appUrl, slug]
  );
  const structuredData = useMemo(() => {
    if (!item) return null;
    const canonical = `${appUrl.replace(/\/$/, "")}/payment/${slug ?? item.id}`;
    const priceCurrency = item.priceUsd != null ? "USD" : "HBAR";
    const priceValue =
      item.priceUsd != null ? item.priceUsd.toFixed(2) : totalHbar.toString();
    return {
      "@context": "https://schema.org",
      "@type": "Product",
      name: item.name,
      description: item.description ?? "Hedera payment link powered by LinkUp.",
      image: item.imageUrl ? [item.imageUrl] : undefined,
      offers: {
        "@type": "Offer",
        priceCurrency,
        price: priceValue,
        url: canonical,
        availability: "https://schema.org/InStock",
        acceptedPaymentMethod: {
          "@type": "PaymentMethod",
          name: "HBAR",
        },
      },
      brand: {
        "@type": "Organization",
        name: "LinkUp Merchant",
      },
    };
  }, [item, appUrl, slug, totalHbar]);

  const handleConnect = async () => {
    if (walletConnected) {
      disconnect();
    } else {
      await connect();
    }
  };

  const handlePairViaQr = async () => {
    if (walletConnected || walletStatus === "connecting") return;
    setPairingModalOpen(true);
    try {
      await connectWithQr();
    } catch (err) {
      console.error("QR pairing failed or was cancelled", err);
      setPairingModalOpen(false);
      clearPairingUri();
    }
  };

  useEffect(() => {
    if (!pairingUri) {
      setPairingModalOpen(false);
    }
  }, [pairingUri]);

  const handlePay = async () => {
    if (!item) return;
    if (!contractId) {
      setError("Payment contract is not configured.");
      return;
    }
    if (!buyerAccountId) {
      setError("Connect a Hedera wallet before paying.");
      return;
    }
    setLoadingPay(true);
    setStatus("processing");
    setError(null);
    try {
      const payload = serializePaymentTransaction(contractId, item, buyerAccountId);
      const response = await submitTransaction(payload, buyerAccountId);
      const txId = extractTransactionId(response);
      setTransactionId(txId);
      setSuccessMessage(item.successMessage ?? "Thank you for your purchase!");
      setStatus("success");
      try {
        await recordPaymentTransaction(item.recordId, txId, "payment", buyerAccountId);
      } catch (err) {
        console.warn("Failed to record on backend", err);
      }
    } catch (e: any) {
      console.error("Payment failed", e);
      setStatus("error");
      setError(e?.message ?? "Payment failed. Please try again.");
    } finally {
      setLoadingPay(false);
    }
  };

  const handleRedirect = () => {
    if (item?.redirectUrl) {
      window.location.href = item.redirectUrl;
    }
  };

  if (loading) {
    return (
      <>
        <Seo
          title="Preparing checkout"
          description="Loading Hedera-native checkout details. LinkUp verifies payment data before rendering the link."
          noIndex
          canonical={canonicalUrl}
        />
        <div className="min-h-screen bg-slate-950 text-slate-400">
          <div className="flex min-h-screen items-center justify-center">
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-6 py-3">
              <span className="h-3 w-3 animate-pulse rounded-full bg-indigo-400" />
              Loading checkout…
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error || !item) {
    return (
      <>
        <Seo
          title="Payment unavailable"
          description={error ?? "This LinkUp link is inactive or cannot be found."}
          canonical={canonicalUrl}
        />
        <div className="min-h-screen bg-slate-950 text-slate-400">
          <div className="flex min-h-screen items-center justify-center">
            <div className="max-w-md rounded-3xl border border-red-400/40 bg-red-500/10 px-8 py-6 text-center text-sm text-red-100">
              {error ?? "Payment not available."}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo
        title={item.name}
        description={
          item.description
            ? item.description
            : `Complete a secure Hedera payment for ${item.name} using LinkUp checkout.`
        }
        image={item.imageUrl ?? null}
        canonical={canonicalUrl}
        structuredData={structuredData ?? undefined}
        keywords={[
          `${item.name} Hedera payment`,
          "LinkUp checkout",
          "Hedera crypto payment",
          "digital goods payment link",
        ]}
      />
      <div className="relative min-h-screen overflow-hidden bg-[#0c165e] text-slate-100">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(18,49,220,0.25),transparent_55%),radial-gradient(circle_at_bottom,_rgba(12,22,94,0.35),transparent_50%)]" />
        <div className="pointer-events-none absolute left-1/2 top-[-18%] h-80 w-80 -translate-x-1/2 rounded-full bg-[#1231dc]/30 blur-3xl" />
        <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-16">
          <div className="w-full max-w-4xl rounded-[40px] border border-white/10 bg-white/5 p-8 shadow-[0_50px_120px_-50px_rgba(18,49,220,0.5)] backdrop-blur-xl sm:p-12">
            <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#9ea6ff]/80">LinkUp Checkout</p>
                <h1 className="text-2xl font-semibold text-white">Secure Hedera payment</h1>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-indigo-400/40 hover:text-white"
                  onClick={() => setShareOpen(true)}
                >
                  Share
                </button>
                {walletConnected && buyerAccountId ? (
                  <button
                    className="flex items-center gap-2 rounded-full border border-[#6f7bff]/50 bg-[#2d2fa8]/20 px-4 py-2 text-xs font-semibold text-[#d7dbff]"
                    onClick={handleConnect}
                    disabled={walletStatus === "connecting"}
                  >
                    <span className="h-2 w-2 rounded-full bg-[#6f7bff]" />
                    {buyerAccountId}
                  </button>
                ) : (
                  <button
                    className="hedera-gradient rounded-full px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:brightness-110"
                    onClick={handleConnect}
                    disabled={walletStatus === "connecting"}
                  >
                    {walletStatus === "connecting" ? "Connecting…" : "Connect wallet"}
                  </button>
                )}
                {!walletConnected ? (
                  <button
                    type="button"
                    className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-indigo-200 transition hover:border-indigo-400/40 hover:text-white"
                    onClick={handlePairViaQr}
                    disabled={walletStatus === "connecting"}
                  >
                    {walletStatus === "connecting" ? "Waiting…" : "Pair via QR"}
                  </button>
                ) : null}
              </div>
            </header>

          <main className="mt-8">
            <div className="flex flex-col gap-10 lg:flex-row">
              {item.imageUrl && imageVisible && (
                <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-2 lg:w-1/2">
                  <div className="aspect-[4/3] w-full h-full overflow-hidden">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-full w-full object-contain"
                      onError={() => setImageVisible(false)}
                    />
                  </div>
                </div>
              )}

              <div
                className={`${
                  item.imageUrl && imageVisible ? "lg:w-1/2" : "lg:w-2/3"
                } w-full space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6`}
              >
                <div className="space-y-3">
                  <h2 className="text-2xl font-semibold text-white">{item.name}</h2>
                  {item.description ? (
                    <p className="text-sm leading-relaxed text-slate-300">{item.description}</p>
                  ) : null}
                </div>

                <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <Row label="Price" value={`${round4(item.amountHbar)} HBAR`} />
                  <Row label="Charges" value={`${feeHbar} HBAR`} />
                  <Row
                    label={<span className="font-semibold text-white">Total</span>}
                    value={<span className="font-semibold text-white">{totalHbar} HBAR</span>}
                  />
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handlePay}
                    disabled={loadingPay || status === "success"}
                    className={`w-full inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold shadow-lg transition disabled:opacity-60 ${
                      status === "success"
                        ? "bg-[#1231dc] text-white"
                        : "hedera-gradient text-white hover:brightness-110"
                    }`}
                  >
                    {status === "processing" ? (
                      <span className="flex items-center gap-2">
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                        Processing…
                      </span>
                    ) : status === "success" ? (
                      "Paid"
                    ) : (
                      "Pay"
                    )}
                  </button>
                  <p className="text-xs text-slate-500">
                    Payments run on Hedera. Your wallet confirms the exact amount before submission.
                  </p>

                  {status === "success" && successMessage ? (
                    <div className="rounded-2xl border border-[#6f7bff]/40 bg-[#1231dc]/15 p-4 text-center">
                      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#2d2fa8] text-white">
                        <svg
                          className="h-8 w-8 animate-pulse"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-[#d7dbff]">{successMessage}</p>
                      {item.redirectUrl ? (
                        <button
                          type="button"
                          onClick={handleRedirect}
                          className="mt-4 inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:border-white/40 hover:bg-white/20"
                        >
                          Continue
                        </button>
                      ) : null}
                      {transactionId ? (
                        <a
                          href={`${HASHSCAN_BASE}${transactionId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center justify-center rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-indigo-100 transition hover:border-white/30 hover:text-white"
                        >
                          View on HashScan
                        </a>
                      ) : null}
                    </div>
                  ) : null}

                  {status === "error" && error ? (
                    <p className="text-sm text-red-300">{error}</p>
                  ) : null}
                </div>
              </div>
            </div>
          </main>
        </div>
        </div>
        <QrShareModal
          isOpen={shareOpen}
          value={canonicalUrl}
          title="Share this checkout link"
          subtitle="Send this QR code to your buyer to open the LinkUp payment page."
          onClose={() => setShareOpen(false)}
          ctaLabel="Open checkout"
        />
        <QrShareModal
          isOpen={pairingModalOpen}
          value={pairingUri ?? ""}
          title="Pair your wallet"
          subtitle="Scan this QR with HashPack, Blade, or any Hedera WalletConnect app to link your wallet."
          onClose={() => {
            setPairingModalOpen(false);
            clearPairingUri();
          }}
          ctaLabel="Open HashPack"
        />
      </div>
    </>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
      <span className="text-xs uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-sm text-white">{value}</span>
    </div>
  );
}

function round4(n: number) {
  return Math.round(n * 10000) / 10000;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    return window.btoa(binary);
  }
  if (typeof globalThis !== "undefined" && typeof (globalThis as any).Buffer !== "undefined") {
    return (globalThis as any).Buffer.from(bytes).toString("base64");
  }
  throw new Error("Base64 encoding is not supported in this environment.");
}

function serializePaymentTransaction(contractId: ContractId, item: PaymentItem, payerAccount: string) {
  const payer = AccountId.fromString(payerAccount);
  const nodeIds =
    (DEFAULT_NODE_ACCOUNTS[HEDERA_NETWORK] ?? DEFAULT_NODE_ACCOUNTS.testnet).map((id) =>
      AccountId.fromString(id)
    );
  const metadataUri = item.imageUrl ?? "";
  const tx = new ContractExecuteTransaction()
    .setContractId(contractId)
    .setGas(350000)
    .setFunction("pay", new ContractFunctionParameters().addString(item.id).addString(metadataUri))
    .setPayableAmount(new Hbar(item.totalHbar))
    .setTransactionId(TransactionId.generate(payer))
    .setNodeAccountIds(nodeIds);
  tx.freeze();
  return bytesToBase64(tx.toBytes());
}

function extractTransactionId(response: any): string {
  if (response?.error) {
    const message =
      response.error.message ?? response.error.data ?? "Wallet reported an error while signing.";
    throw new Error(message);
  }

  const txResult = response?.result ?? response;
  if (!txResult) {
    throw new Error("Wallet did not return a transaction result.");
  }

  const txId =
    txResult.transactionId ??
    txResult.transactionIdString ??
    txResult.transactionIdStr ??
    txResult.transaction_id ??
    null;
  if (!txId) {
    throw new Error("Wallet did not return a transaction ID.");
  }

  const status: string | undefined =
    txResult.status ?? txResult.receipt?.status ?? txResult.receipt?.status?.name;
  if (typeof status === "string" && status.toUpperCase() !== "SUCCESS") {
    throw new Error(`Transaction failed with status ${status}`);
  }

  return String(txId);
}

function mapPayment(payment: PaymentRecord): PaymentItem {
  return {
    recordId: payment.id,
    id: payment.paymentLink,
    name: payment.name,
    description: payment.description ?? undefined,
    amountHbar: payment.priceHbar,
    feeHbar: payment.feeHbar ?? 0,
    totalHbar: payment.totalHbar ?? payment.priceHbar + (payment.feeHbar ?? 0),
    imageUrl: payment.image,
    successMessage: payment.customSuccessMessage,
    redirectUrl: payment.redirectUrl,
    priceUsd: payment.priceUSD ?? null,
  };
}
