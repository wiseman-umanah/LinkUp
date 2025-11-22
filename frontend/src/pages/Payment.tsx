import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchPublicPayment, type PaymentRecord } from "../api/payments";
import { Seo } from "../components/Seo";

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

export default function PublicPaymentPage() {
  const [item, setItem] = useState<PaymentItem | null>(null);
  const [imageVisible, setImageVisible] = useState(true);
  const [loadingPay, setLoadingPay] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const { slug } = useParams<{ slug: string }>();

  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

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

  useEffect(() => {
    if (status === "success" && item?.redirectUrl) {
      const timeout = window.setTimeout(() => {
        window.location.href = item.redirectUrl as string;
      }, 4000);
      return () => window.clearTimeout(timeout);
    }
    return undefined;
  }, [status, item?.redirectUrl]);

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

  const connectWallet = () => {
    setWalletConnected(true);
    const fakeAddress = `0x${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 6)}`;
    setWalletAddress(fakeAddress);
  };

  const disconnectWallet = () => {
    setWalletConnected(false);
    setWalletAddress(null);
  };

  const handlePay = async () => {
    if (!walletConnected) {
      setError("Connect a wallet before paying.");
      return;
    }
    if (!item) return;
    setLoadingPay(true);
    setStatus("processing");
    setError(null);
    try {
      setSuccessMessage(item.successMessage ?? "Thank you for your purchase!");
      setStatus("success");
    } catch (e) {
      setStatus("error");
      setError("Payment failed. Please try again.");
    } finally {
      setLoadingPay(false);
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

            {walletConnected && walletAddress ? (
              <button
                className="flex items-center gap-2 rounded-full border border-[#6f7bff]/50 bg-[#2d2fa8]/20 px-4 py-2 text-xs font-semibold text-[#d7dbff]"
                onClick={disconnectWallet}
              >
                <span className="h-2 w-2 rounded-full bg-[#6f7bff]" />
                {walletAddress}
              </button>
            ) : (
              <button
                className="hedera-gradient px-4 py-2 text-xs font-semibold text-white rounded-full shadow-lg transition hover:brightness-110"
                onClick={connectWallet}
              >
                Connect wallet
              </button>
            )}
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
                        <p className="mt-2 text-xs text-[#b5bffe]">Redirecting you shortly…</p>
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
