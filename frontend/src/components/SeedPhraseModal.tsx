import { useState } from "react";

type SeedPhraseModalProps = {
  phrase: string;
  onDismiss: () => void;
};

const wordStyles =
  "rounded-md border border-indigo-500/40 bg-indigo-900/30 px-3 py-2 text-sm font-medium text-indigo-100";

export function SeedPhraseModal({ phrase, onDismiss }: SeedPhraseModalProps) {
  const [copied, setCopied] = useState(false);
  const words = phrase.trim().split(/\s+/);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(phrase);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      setCopied(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6">
      <div className="w-full max-w-2xl rounded-3xl border border-indigo-500/40 bg-slate-900/80 p-8 text-white shadow-2xl backdrop-blur">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-indigo-300/80">Secure your wallet</p>
            <h2 className="mt-1 text-2xl font-semibold">Save your Hedera seed phrase</h2>
            <p className="mt-2 text-sm text-slate-200">
              Anyone with this phrase can control your LinkUp custodial wallet. Store it offline before
              continuing to the dashboard.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-950/40 p-4 sm:grid-cols-3">
            {words.map((word, index) => (
              <div key={`${word}-${index}`} className={wordStyles}>
                <span className="mr-2 text-xs font-semibold text-indigo-300">{index + 1}.</span>
                {word}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center justify-center rounded-xl border border-indigo-500/50 px-4 py-2 text-sm font-medium text-indigo-200 transition hover:bg-indigo-500/10"
            >
              {copied ? "Seed phrase copied" : "Copy phrase"}
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="inline-flex items-center justify-center rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-600"
            >
              I’ve stored this phrase safely
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SeedPhraseModal;
