import { useEffect, useMemo, useState } from "react";
import Sidebar, { type SidebarSection } from "../components/Sidebar";
import {
  PaymentLinksSection,
  TransactionsSection,
  ProfileSection,
  SettingsSection,
  ApiSection,
} from "../components/dashboard";
import { useAuth } from "../context/AuthContext";
import {
  listPayments,
  createPayment,
  deletePayment,
  listTransactions,
  type PaymentRecord,
  type TransactionRecord,
} from "../api/payments";
import { changePassword } from "../api/profile";
import { PiCoinsDuotone, PiArrowBendUpRightDuotone, PiUsersThreeDuotone, PiListDuotone } from "react-icons/pi";
import { Seo } from "../components/Seo";

const HBAR_RATE_URL = "https://api.coinbase.com/v2/exchange-rates?currency=HBAR";
const HBAR_RATE_TTL_MS = 5 * 60 * 1000;
const MIRROR_BASES: Record<string, string> = {
  mainnet: "https://mainnet-public.mirrornode.hedera.com",
  testnet: "https://testnet.mirrornode.hedera.com",
};

let cachedHbarUsdRate: { value: number; expires: number } | null = null;

const demoCreatedAt = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();
const demoUpdatedAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

const DEMO_PAYMENTS: PaymentRecord[] = [
  {
    id: "demo-1",
    name: "HBAR Hoodie",
    image: null,
    description: "Ultra-soft hoodie representing the Hedera ecosystem.",
    customSuccessMessage: "Thanks for supporting LinkUp!",
    redirectUrl: null,
    priceHbar: 5,
    priceUSD: 25,
    feeHbar: 0.1,
    totalHbar: 5.1,
    paymentLink: "hedera-hoodie",
    status: "active",
    createdAt: demoCreatedAt,
    updatedAt: demoUpdatedAt,
    blockchainCreateTx: "demo-create",
    blockchainDeactivateTx: null,
    imagePublicId: null,
    sellerAddress: "0xDemoSeller",
  },
  {
    id: "demo-2",
    name: "Validator Sticker Pack",
    image: null,
    description: "Holographic sticker pack for Hedera validators.",
    customSuccessMessage: "Stickers on the way!",
    redirectUrl: null,
    priceHbar: 2.5,
    priceUSD: 12.5,
    feeHbar: 0.05,
    totalHbar: 2.55,
    paymentLink: "hedera-stickers",
    status: "active",
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    blockchainCreateTx: "demo-create-2",
    blockchainDeactivateTx: null,
    imagePublicId: null,
    sellerAddress: "0xDemoSeller",
  },
];

const DEMO_TRANSACTIONS: TransactionRecord[] = [
  {
    id: "demo-tx-1",
    paymentId: "demo-1",
    paymentName: "HBAR Hoodie",
    paymentSlug: "hedera-hoodie",
    txId: "0xDEMOHBAR1",
    kind: "payment",
    payerAddress: "0xDemoBuyer1",
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-tx-2",
    paymentId: "demo-2",
    paymentName: "Validator Sticker Pack",
    paymentSlug: "hedera-stickers",
    txId: "0xDEMOHBAR2",
    kind: "payment",
    payerAddress: "0xDemoBuyer2",
    createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
  },
];

async function fetchHbarUsdRate(): Promise<number> {
  const response = await fetch(HBAR_RATE_URL);
  if (!response.ok) throw new Error(`Rate request failed: ${response.status}`);
  const json = await response.json();
  const usdString = json?.data?.rates?.USD;
  const parsed = Number(usdString);
  if (!usdString || Number.isNaN(parsed)) throw new Error("Invalid USD rate");
  return parsed;
}

async function fetchWalletBalance(accountId: string, network: string): Promise<number> {
  const normalized = accountId.split("-")[0];
  const base = MIRROR_BASES[network.toLowerCase()] ?? MIRROR_BASES.testnet;
  const response = await fetch(`${base}/api/v1/accounts/${normalized}`);
  if (!response.ok) throw new Error("Balance request failed");
  const json = await response.json();
  const tinybars = json?.balance?.balance ?? 0;
  return tinybars / 1e8;
}

type StatCard = {
  title: string;
  value: string;
  helper: string;
  icon: React.ComponentType<{ className?: string }>;
};

function buildStatCards(
  summary: { count: number; totalHbar: number; totalUsd: number | null },
  loadingFlow: boolean,
  loadingRate: boolean,
  rateError: string | null
): StatCard[] {
  return [
    {
      title: "Active payment links",
      value: String(summary.count),
      helper: "Links available to customers",
      icon: PiCoinsDuotone,
    },
    {
      title: "Total HBAR earned",
      value: loadingFlow ? "—" : `${summary.totalHbar.toFixed(2)} HBAR`,
      helper: loadingFlow ? "Fetching on-chain earnings" : "Reported directly from LinkUp",
      icon: PiArrowBendUpRightDuotone,
    },
    {
      title: "USD equivalent",
      value: loadingRate ? "…" : summary.totalUsd != null ? `$${summary.totalUsd.toFixed(2)}` : "—",
      helper: rateError
        ? rateError
        : loadingRate
          ? "Fetching HBAR → USD rate"
          : "Estimated using Coinbase rate",
      icon: PiUsersThreeDuotone,
    },
  ];
}

const Dashboard: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SidebarSection>("payment");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [transactionsFetched, setTransactionsFetched] = useState(false);
  const { seller, updateProfile, tokens, patchSeller } = useAuth();
  const demoMode = !seller || !tokens?.accessToken;
  const walletAccountId = seller?.walletAccountId ?? (demoMode ? "0.0.demo" : null);
  const walletNetwork = seller?.walletNetwork ?? (import.meta.env.VITE_HEDERA_NETWORK ?? "testnet");
  const [walletBalance, setWalletBalance] = useState<number | null>(demoMode ? 128.42 : null);
  const [walletBalanceLoading, setWalletBalanceLoading] = useState(!demoMode);
  const [walletBalanceError, setWalletBalanceError] = useState<string | null>(null);
  const [usdRate, setUsdRate] = useState<number | null>(() => {
    const now = Date.now();
    if (cachedHbarUsdRate && cachedHbarUsdRate.expires > now) {
      return cachedHbarUsdRate.value;
    }
    return null;
  });
  const [loadingRates, setLoadingRates] = useState(() => {
    const now = Date.now();
    return !(cachedHbarUsdRate && cachedHbarUsdRate.expires > now);
  });
  const [rateError, setRateError] = useState<string | null>(null);

  useEffect(() => {
    if (demoMode) {
      setPayments(DEMO_PAYMENTS);
      setLoadingPayments(false);
      return;
    }
    if (!seller || !tokens?.accessToken) {
      return;
    }
    const fetchPayments = async () => {
      setLoadingPayments(true);
      setError(null);
      try {
        const data = await listPayments();
        setPayments(data.items);
      } catch (err: any) {
        setError(err?.response?.data?.error ?? "Unable to load payment links.");
      } finally {
        setLoadingPayments(false);
      }
    };
    void fetchPayments();
  }, [demoMode, seller, tokens?.accessToken]);

useEffect(() => {
  let cancelled = false;
    const now = Date.now();
    if (cachedHbarUsdRate && cachedHbarUsdRate.expires > now) {
      setUsdRate(cachedHbarUsdRate.value);
      setLoadingRates(false);
      return;
    }
    const fetchRate = async () => {
      setLoadingRates(true);
      setRateError(null);
      try {
        const parsed = await fetchHbarUsdRate();
        cachedHbarUsdRate = { value: parsed, expires: Date.now() + HBAR_RATE_TTL_MS };
        if (!cancelled) {
          setUsdRate(parsed);
        }
      } catch (err) {
        if (!cancelled) {
          setRateError("Unable to fetch HBAR → USD rate");
          setUsdRate(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingRates(false);
        }
      }
    };
    void fetchRate();
  return () => {
    cancelled = true;
  };
}, []);

  useEffect(() => {
    if (demoMode) {
      setWalletBalance(128.42);
      setWalletBalanceLoading(false);
      setWalletBalanceError(null);
      return;
    }
    if (!walletAccountId) {
      setWalletBalance(null);
      setWalletBalanceError("Wallet not provisioned");
      setWalletBalanceLoading(false);
      return;
    }
    let cancelled = false;
    setWalletBalanceLoading(true);
    setWalletBalanceError(null);
    fetchWalletBalance(walletAccountId, walletNetwork)
      .then((balance) => {
        if (!cancelled) {
          setWalletBalance(balance);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWalletBalance(null);
          setWalletBalanceError("Unable to fetch balance");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setWalletBalanceLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [walletAccountId, walletNetwork, demoMode]);

  useEffect(() => {
    if (demoMode) {
      if (!transactionsFetched) {
        setTransactions(DEMO_TRANSACTIONS);
        setTransactionsFetched(true);
      }
      return;
    }
    if (activeSection !== "transactions" || transactionsFetched || !seller) return;
    const fetchTransactions = async () => {
      setLoadingTransactions(true);
      setTransactionsError(null);
      try {
        const data = await listTransactions();
        setTransactions(data.items);
        setTransactionsFetched(true);
      } catch (err: any) {
        setTransactionsError(err?.response?.data?.error ?? "Unable to load transactions.");
      } finally {
        setLoadingTransactions(false);
      }
    };
    fetchTransactions();
  }, [activeSection, transactionsFetched, seller, demoMode]);

  const statSummary = useMemo(() => {
    const activePayments = payments.filter((p) => p.status === "active");
    const totalLinks = activePayments.length;
    const onChain = activePayments.reduce((sum, payment) => sum + (Number(payment.totalHbar) || 0), 0);
    const usdEquivalent = usdRate != null ? onChain * usdRate : null;
    return {
      count: totalLinks,
      totalHbar: onChain,
      totalUsd: usdEquivalent,
    };
  }, [payments, usdRate]);

  const statCards = useMemo(
    () => buildStatCards(statSummary, false, loadingRates, rateError),
    [statSummary, loadingRates, rateError]
  );

  const handleCreatePayment = async (payload: {
    name: string;
    description: string;
    amountHbar: number;
    successMessage: string;
    redirectUrl?: string;
    slug: string;
    imageBase64?: string | null;
    imageMimeType?: string | null;
  }) => {
    if (!walletAccountId && !demoMode) {
      setError("Wallet is not provisioned yet.");
      return;
    }
    setLoadingAction(true);
    setError(null);
    try {
      if (demoMode) {
        const fee = Number((payload.amountHbar * 0.02).toFixed(4));
        const total = Number((payload.amountHbar + fee).toFixed(4));
        const demoImage =
          payload.imageBase64 && payload.imageMimeType
            ? `data:${payload.imageMimeType};base64,${payload.imageBase64}`
            : null;
        const demoPayment: PaymentRecord = {
          id: `demo-${Date.now()}`,
          name: payload.name,
          image: demoImage,
          description: payload.description,
          customSuccessMessage: payload.successMessage,
          redirectUrl: payload.redirectUrl ?? null,
          priceHbar: payload.amountHbar,
          priceUSD: usdRate != null ? Number((payload.amountHbar * usdRate).toFixed(2)) : null,
          feeHbar: fee,
          totalHbar: total,
          paymentLink: payload.slug,
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          blockchainCreateTx: "demo-create",
          blockchainDeactivateTx: null,
          imagePublicId: null,
          sellerAddress: walletAccountId,
        };
        setPayments((prev) => [demoPayment, ...prev]);
      } else {
        const payment = await createPayment({
          name: payload.name,
          description: payload.description,
          priceHbar: payload.amountHbar,
          customSuccessMessage: payload.successMessage,
          redirectUrl: payload.redirectUrl,
          slug: payload.slug,
          imageBase64: payload.imageBase64 ?? undefined,
          imageMimeType: payload.imageMimeType ?? undefined,
          priceUSD: usdRate != null ? Number((payload.amountHbar * usdRate).toFixed(2)) : undefined,
        });
        setPayments((prev) => [payment, ...prev]);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Unable to create payment.");
      throw err;
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDeletePayment = async (payment: PaymentRecord) => {
    if (!window.confirm(`Delete payment link "${payment.name}"?`)) {
      return;
    }
    if (!walletAccountId && !demoMode) {
      setError("Wallet is not provisioned yet.");
      return;
    }
    if (!demoMode && payment.sellerAddress && walletAccountId && payment.sellerAddress !== walletAccountId) {
      setError("Connected wallet cannot deactivate this link.");
      return;
    }
    setLoadingAction(true);
    setError(null);
    try {
      if (demoMode) {
        setPayments((prev) => prev.filter((item) => item.id !== payment.id));
      } else {
        await deletePayment(payment.id);
        setPayments((prev) => prev.filter((item) => item.id !== payment.id));
      }
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Unable to delete payment.");
    } finally {
      setLoadingAction(false);
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case "payment":
        return (
          <PaymentLinksSection
            payments={payments}
            loading={loadingPayments}
            walletAccountId={walletAccountId}
            hbarToUsdRate={usdRate}
            rateLoading={loadingRates}
            onCreatePayment={handleCreatePayment}
            onDeletePayment={handleDeletePayment}
          />
        );
      case "transactions":
        return (
          <TransactionsSection
            transactions={transactions}
            loading={loadingTransactions}
            error={transactionsError}
            onRetry={() => setTransactionsFetched(false)}
          />
        );
      case "profile":
        return (
          <ProfileSection
            seller={seller ?? null}
            walletAddress={walletAccountId}
            onUpdateProfile={updateProfile}
            onChangePassword={changePassword}
            onWalletChange={(accountId, network) => {
              if (!seller) return;
              patchSeller({ walletAccountId: accountId, walletNetwork: network });
            }}
          />
        );
      case "api":
        return <ApiSection />;
      default:
        return <SettingsSection />;
    }
  };

  return (
    <>
      <Seo
        title="Merchant dashboard"
        description="Monitor Hedera payment performance, sync wallet payouts, and configure LinkUp automation from a single dashboard."
        noIndex
        keywords={[
          "Hedera merchant dashboard",
          "payment analytics",
          "crypto payouts",
          "LinkUp console",
          "HBAR earnings tracker",
        ]}
      />
      <div className="relative flex min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(18,49,220,0.18),transparent_55%),radial-gradient(circle_at_bottom,_rgba(12,22,94,0.35),transparent_50%)]" />
      <div className="pointer-events-none fixed left-1/2 top-[-18%] h-96 w-96 -translate-x-1/2 rounded-full bg-[#1231dc]/30 blur-3xl" />

      <button
        type="button"
        className="absolute left-4 top-5 z-30 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:border-[#6f7bff]/40 hover:text-white lg:hidden"
        onClick={() => setMobileNavOpen(true)}
      >
        <PiListDuotone className="h-6 w-6" />
      </button>

      <Sidebar active={activeSection} onSelect={setActiveSection} />
      {mobileNavOpen ? (
        <>
          <div
            className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur lg:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
          <Sidebar
            active={activeSection}
            onSelect={setActiveSection}
            mobile
            onClose={() => setMobileNavOpen(false)}
          />
        </>
      ) : null}

      <div className="relative z-10 flex min-h-screen flex-1 flex-col overflow-auto">
        <header className="px-4 pt-14 sm:px-8 lg:pt-12">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-widest text-[#9ea6ff]/80">LinkUp Studio</p>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">
                {seller?.businessName ?? "LinkUp merchant"}
              </h1>
              <p className="text-sm text-slate-400">
                Manage Hedera payment links, payouts, and insights from a single dashboard.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-slate-300">
              <div className="flex items-center justify-between text-xs uppercase tracking-widest text-slate-500">
                <span>Custodial wallet</span>
                <span>{walletNetwork}</span>
              </div>
              <p className="mt-2 font-mono text-base text-white">
                {walletAccountId ? walletAccountId : "Provisioning…"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {walletBalanceLoading
                  ? "Fetching balance…"
                  : walletBalance != null
                    ? `${walletBalance.toFixed(4)} HBAR`
                    : walletBalanceError ?? "Balance unavailable"}
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 space-y-8 px-4 pb-16 pt-6 sm:px-8 overflow-x-hidden">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {statCards.map(({ title, value, helper, icon: Icon }) => (
              <article
                key={title}
                className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_30px_90px_-45px_rgba(18,49,220,0.55)] backdrop-blur"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-300">{title}</p>
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#2d2fa8]/20 text-[#d7dbff]">
                    <Icon className="h-5 w-5" />
                  </span>
                </div>
                <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
                <p className="mt-2 text-xs text-slate-500">{helper}</p>
              </article>
            ))}
          </section>

          {error ? (
            <div className="rounded-3xl border border-red-400/40 bg-red-500/10 p-5 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          {loadingAction ? (
            <div className="flex items-center gap-3 rounded-3xl border border-[#6f7bff]/30 bg-[#1231dc]/10 px-5 py-3 text-sm text-[#d7dbff]">
              <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-[#6f7bff]" />
              Processing request…
            </div>
          ) : null}

          {renderSection()}
        </main>
      </div>
      </div>
    </>
  );
};

export default Dashboard;
