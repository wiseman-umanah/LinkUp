import { useMemo, useState } from "react";
import { PiMagnifyingGlassDuotone, PiLinkDuotone, PiTrashDuotone, PiPlusCircleDuotone } from "react-icons/pi";
import PaymentLinkModal from "./PaymentLinkModal";
import QrShareModal from "./QrShareModal";
import type { PaymentRecord } from "../api/payments";

type PaymentProps = {
  payments: PaymentRecord[];
  loading: boolean;
  walletAccountId?: string | null;
  hbarToUsdRate: number | null;
  rateLoading: boolean;
  onCreatePayment: (payload: {
    name: string;
    description: string;
    amountHbar: number;
    successMessage: string;
    redirectUrl?: string;
    slug: string;
    imageBase64?: string | null;
  }) => Promise<void>;
  onDeletePayment: (payment: PaymentRecord) => Promise<void>;
};

export function Payment({
  payments,
  loading,
  walletAccountId,
  hbarToUsdRate,
  rateLoading,
  onCreatePayment,
  onDeletePayment,
}: PaymentProps) {
  const [search, setSearch] = useState("");
  const [isModalOpen, setModalOpen] = useState(false);
  const [qrLink, setQrLink] = useState<string | null>(null);
  const [qrTitle, setQrTitle] = useState<string>("Share link");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const filteredLinks = useMemo(() => {
    const normalizedSearch = search.toLowerCase();
    return payments
      .filter((link) => (statusFilter === "all" ? true : link.status === statusFilter))
      .filter((link) => link.name.toLowerCase().includes(normalizedSearch));
  }, [payments, search, statusFilter]);

  const canDelete = (link: PaymentRecord) => {
    if (!walletAccountId) return false;
    if (link.status !== "active") return false;
    if (link.sellerAddress && walletAccountId && link.sellerAddress !== walletAccountId) return false;
    return true;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <PiMagnifyingGlassDuotone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search payment links"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1 text-xs font-semibold text-slate-400">
          {["all", "active", "inactive"].map((filter) => (
            <button
              key={filter}
              type="button"
              className={`rounded-full px-3 py-1 ${
                statusFilter === filter ? "bg-indigo-500 text-white" : "text-slate-400 hover:text-white"
              }`}
              onClick={() => setStatusFilter(filter as typeof statusFilter)}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={!walletAccountId}
          onClick={() => setModalOpen(true)}
          className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg transition ${
            walletAccountId
              ? "bg-gradient-to-r from-indigo-400 via-indigo-500 to-sky-500 hover:brightness-110"
              : "cursor-not-allowed bg-white/10 text-slate-400"
          }`}
        >
          <PiPlusCircleDuotone className="h-4 w-4" />
          Create link
        </button>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-white/5 text-sm text-slate-300">
            <thead className="bg-white/5 text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="whitespace-nowrap px-6 py-4 text-left">Link</th>
                <th className="whitespace-nowrap px-6 py-4 text-left">HBAR amount</th>
                <th className="whitespace-nowrap px-6 py-4 text-left">Fiat (USD)</th>
                <th className="whitespace-nowrap px-6 py-4 text-left">Total HBAR</th>
                <th className="whitespace-nowrap px-6 py-4 text-left">Created</th>
                <th className="whitespace-nowrap px-6 py-4 text-left">Actions</th>
                <th className="whitespace-nowrap px-6 py-4 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-slate-500">
                    Loading payment links…
                  </td>
                </tr>
              ) : filteredLinks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-slate-500">
                    No payment links yet. Create your first one to start accepting Hedera payments.
                  </td>
                </tr>
              ) : (
                filteredLinks.map((link) => (
                  <tr key={link.id} className="divide-y divide-white/5 bg-white/0 transition hover:bg-indigo-500/10">
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="font-semibold text-white">{link.name}</span>
                        <span className="text-xs text-slate-500">{link.paymentLink}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-white">{Number(link.priceHbar).toFixed(4)}</td>
                    <td className="px-6 py-5">
                      {rateLoading
                        ? "Loading…"
                        : hbarToUsdRate != null
                          ? `$${(Number(link.totalHbar) * hbarToUsdRate).toFixed(2)}`
                          : link.priceUSD != null
                            ? `$${Number(link.priceUSD).toFixed(2)}`
                            : "—"}
                    </td>
                    <td className="px-6 py-5 text-white">{Number(link.totalHbar).toFixed(4)}</td>
                    <td className="px-6 py-5 text-slate-400">
                      {new Date(link.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        {link.status === "active" ? (
                          <>
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-indigo-200 transition hover:border-indigo-400/40 hover:bg-indigo-500/10"
                              onClick={() => {
                                const origin =
                                  typeof window !== "undefined"
                                    ? window.location.origin
                                    : import.meta.env.VITE_APP_URL ?? "";
                                const paymentUrl = `${origin.replace(/\/$/, "")}/payment/${link.paymentLink}`;
                                setQrTitle(link.name ?? "Payment link");
                                setQrLink(paymentUrl);
                              }}
                            >
                              <PiLinkDuotone className="h-4 w-4" /> Preview
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 transition hover:border-red-400/40 hover:bg-red-500/20 disabled:border-white/5 disabled:bg-white/5 disabled:text-slate-500"
                              disabled={!canDelete(link)}
                              onClick={() => onDeletePayment(link)}
                            >
                              <PiTrashDuotone className="h-4 w-4" /> Delete
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-500">Inactive</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                          link.status === "active"
                            ? "bg-emerald-500/15 text-emerald-200"
                            : "bg-amber-500/15 text-amber-200"
                        }`}
                      >
                        {link.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PaymentLinkModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={async (payload) => {
          await onCreatePayment(payload);
          setModalOpen(false);
        }}
      />
      <QrShareModal
        isOpen={Boolean(qrLink)}
        value={qrLink ?? ""}
        title={qrTitle}
        subtitle="Share this payment link with your buyer or download the QR code."
        onClose={() => setQrLink(null)}
        ctaLabel="View checkout"
      />
    </div>
  );
}
