import { PiArrowSquareOutDuotone } from "react-icons/pi";
import type { TransactionRecord } from "../../api/payments";

const hederaExplorerBaseUrl = (import.meta.env.VITE_HEDERA_NETWORK ?? "testnet") === "mainnet"
  ? "https://hashscan.io/mainnet/transaction/"
  : "https://hashscan.io/testnet/transaction/";

const shortAddress = (address?: string | null) =>
  !address ? "—" : `${address.slice(0, 6)}…${address.slice(-4)}`;

interface TransactionsSectionProps {
  transactions: TransactionRecord[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export default function TransactionsSection({ transactions, loading, error, onRetry }: TransactionsSectionProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_40px_100px_-50px_rgba(59,130,246,0.5)] backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Transactions</h2>
          <p className="text-sm text-slate-400">Every Hedera transaction your links generated, with direct explorer links.</p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-2xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-indigo-400/40 hover:text-indigo-200"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="mt-6 overflow-hidden overflow-x-auto rounded-3xl border border-white/10">
        <table className="w-full divide-y divide-white/10 text-sm text-slate-300">
          <thead className="bg-white/5 text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="whitespace-nowrap px-6 py-4 text-left">Payment link</th>
              <th className="whitespace-nowrap px-6 py-4 text-left">Transaction</th>
              <th className="whitespace-nowrap px-6 py-4 text-left">Kind</th>
              <th className="whitespace-nowrap px-6 py-4 text-left">Payer wallet</th>
              <th className="whitespace-nowrap px-6 py-4 text-left">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center text-slate-500">
                  Loading transactions…
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center text-slate-500">
                  No transactions yet. Share a payment link to start receiving HBAR.
                </td>
              </tr>
            ) : (
              transactions.map((txn) => (
                <tr key={txn.id} className="divide-y divide-white/10">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-white">{txn.paymentName ?? "Unnamed link"}</span>
                      {txn.paymentSlug ? (
                        <span className="text-xs text-slate-500">{txn.paymentSlug}</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <a
                      href={`${hederaExplorerBaseUrl}${txn.txId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-indigo-200 transition hover:border-indigo-400/40 hover:text-indigo-100"
                    >
                      <PiArrowSquareOutDuotone className="h-4 w-4" />
                      {shortAddress(txn.txId)}
                    </a>
                  </td>
                  <td className="px-6 py-4 capitalize text-slate-200">{txn.kind}</td>
                  <td className="px-6 py-4 text-slate-400">
                    {txn.kind === "payment" && txn.payerAddress ? shortAddress(txn.payerAddress) : "—"}
                  </td>
                  <td className="px-6 py-4 text-slate-400">
                    {txn.createdAt ? new Date(txn.createdAt).toLocaleString() : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
