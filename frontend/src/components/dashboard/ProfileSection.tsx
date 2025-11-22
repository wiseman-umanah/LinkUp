import { useEffect, useState } from "react";
import type { SellerProfile } from "../../api/auth";
import { importWallet } from "../../api/wallet";

const brandGradient = "bg-gradient-to-r from-indigo-400 via-indigo-500 to-sky-500";

interface ProfileSectionProps {
  seller: SellerProfile | null;
  walletAddress: string | null;
  onUpdateProfile: (payload: { businessName?: string; country?: string }) => Promise<any>;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<any>;
  onWalletChange?: (accountId: string, network: string | null) => void;
}

export default function ProfileSection({
  seller,
  walletAddress,
  onUpdateProfile,
  onChangePassword,
  onWalletChange,
}: ProfileSectionProps) {
  const [form, setForm] = useState({ businessName: seller?.businessName ?? "", country: seller?.country ?? "" });
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [walletMessage, setWalletMessage] = useState<string | null>(null);
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  useEffect(() => {
    setForm({
      businessName: seller?.businessName ?? "",
      country: seller?.country ?? "",
    });
  }, [seller]);

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileLoading(true);
    setProfileMessage(null);
    setProfileError(null);
    try {
      await onUpdateProfile({ businessName: form.businessName, country: form.country });
      setProfileMessage("Profile updated");
    } catch (err: any) {
      setProfileError(err?.response?.data?.error ?? "Unable to update profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirm) {
      setPasswordError("New passwords do not match");
      return;
    }
    setPasswordLoading(true);
    setPasswordMessage(null);
    setPasswordError(null);
    try {
      await onChangePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordMessage("Password updated");
      setPasswordForm({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (err: any) {
      setPasswordError(err?.response?.data?.error ?? "Unable to update password");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <article className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_40px_100px_-50px_rgba(59,130,246,0.5)] backdrop-blur">
        <h2 className="text-xl font-semibold text-white">Merchant profile</h2>
        <p className="text-sm text-slate-400">Update your business identity shown to customers.</p>
        {profileMessage ? (
          <div className="mt-4 rounded-2xl border border-indigo-400/40 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-100">
            {profileMessage}
          </div>
        ) : null}
        {profileError ? (
          <div className="mt-4 rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {profileError}
          </div>
        ) : null}
        <form onSubmit={handleProfileSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-200">
            Business name
            <input
              type="text"
              value={form.businessName}
              onChange={(event) => setForm((prev) => ({ ...prev, businessName: event.target.value }))}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              placeholder="Hedera City Fashion"
              required
            />
          </label>
          <label className="block text-sm font-medium text-slate-200">
            Country
            <input
              type="text"
              value={form.country}
              onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value }))}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              placeholder="Nigeria"
              required
            />
          </label>
          <button
            type="submit"
            className={`${brandGradient} w-full rounded-2xl px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60`}
            disabled={profileLoading}
          >
            {profileLoading ? "Saving…" : "Save profile"}
          </button>
        </form>
      </article>

      <article className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_40px_100px_-50px_rgba(59,130,246,0.5)] backdrop-blur">
        <h2 className="text-xl font-semibold text-white">Security</h2>
        <p className="text-sm text-slate-400">Manage password and wallet details associated with your workspace.</p>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-xs text-slate-400">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <p className="text-slate-300">Wallet account ID</p>
              <p className="font-mono text-sm text-white">
                {walletAddress ?? "Not provisioned"}
              </p>
            </div>
            <button
              type="button"
              className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-indigo-200 transition hover:border-indigo-400/50 hover:text-white"
              onClick={() => setWalletModalOpen(true)}
            >
              Change
            </button>
          </div>
        </div>
        {walletMessage ? (
          <div className="mt-3 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {walletMessage}
          </div>
        ) : null}
        {passwordMessage ? (
          <div className="mt-4 rounded-2xl border border-indigo-400/40 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-100">
            {passwordMessage}
          </div>
        ) : null}
        {passwordError ? (
          <div className="mt-4 rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {passwordError}
          </div>
        ) : null}
        <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-4">
          <PasswordField
            label="Current password"
            value={passwordForm.currentPassword}
            onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
          />
          <PasswordField
            label="New password"
            value={passwordForm.newPassword}
            onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
          />
          <PasswordField
            label="Confirm new password"
            value={passwordForm.confirm}
            onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirm: event.target.value }))}
          />
          <button
            type="submit"
            className={`${brandGradient} w-full rounded-2xl px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60`}
            disabled={passwordLoading}
          >
            {passwordLoading ? "Updating…" : "Update password"}
          </button>
        </form>
      </article>
      <WalletImportModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        onImported={({ accountId, network, message }) => {
          setWalletModalOpen(false);
          setWalletMessage(message);
          onWalletChange?.(accountId, network);
        }}
      />
    </section>
  );
}

type PasswordFieldProps = {
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
};

function PasswordField({ label, value, onChange, required = true }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block text-sm font-medium text-slate-200">
      {label}
      <div className="relative mt-2">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          required={required}
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-indigo-300 transition hover:text-indigo-100"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
    </label>
  );
}

type WalletImportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onImported: (payload: { accountId: string; network: string | null; message: string }) => void;
};

function WalletImportModal({ isOpen, onClose, onImported }: WalletImportModalProps) {
  const [accountId, setAccountId] = useState("");
  const [wordCount, setWordCount] = useState<12 | 24>(24);
  const [words, setWords] = useState<string[]>(() => Array(24).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setAccountId("");
      setWords(Array(24).fill(""));
      setWordCount(24);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleWordChange = (index: number, value: string) => {
    setWords((prev) => {
      const next = [...prev];
      next[index] = value.trim();
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const sanitizedWords = words.slice(0, wordCount).map((word) => word.trim()).filter(Boolean);
    if (sanitizedWords.length !== wordCount) {
      setError(`Seed phrase must contain exactly ${wordCount} words.`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await importWallet({ accountId: accountId.trim(), mnemonic: sanitizedWords.join(" ") });
      onImported({
        accountId: response.walletAccountId,
        network: response.walletNetwork,
        message: response.message,
      });
      setAccountId("");
      setWords(Array(24).fill(""));
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Unable to import wallet. Check your seed phrase.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-slate-900/90 p-6 text-slate-200 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-white">Import Hedera wallet</h3>
        <p className="mt-1 text-sm text-slate-400">
          Provide the account ID and corresponding 12 or 24-word seed phrase exported from HashPack or another wallet.
        </p>
        {error ? (
          <div className="mt-4 rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block text-sm font-medium text-slate-200">
            Hedera account ID
            <input
              type="text"
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              placeholder="0.0.123456"
              required
            />
          </label>
          <div>
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1 text-xs font-semibold text-slate-300">
              {[12, 24].map((count) => (
                <button
                  key={count}
                  type="button"
                  className={`rounded-full px-3 py-1 transition ${
                    wordCount === count ? "bg-indigo-500 text-white" : "text-slate-400 hover:text-white"
                  }`}
                  onClick={() => setWordCount(count as 12 | 24)}
                >
                  {count} words
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {words.slice(0, wordCount).map((word, idx) => (
                <label
                  key={`${wordCount}-${idx}`}
                  className="flex flex-col rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400"
                >
                  <span className="text-[11px] font-semibold text-indigo-200">{idx + 1}</span>
                  <input
                    type="text"
                    value={word}
                    onChange={(event) => handleWordChange(idx, event.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/40 px-2 py-1 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                    placeholder="seed"
                    required
                  />
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-white/30"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`${brandGradient} rounded-2xl px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60`}
              disabled={loading}
            >
              {loading ? "Importing…" : "Import wallet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
