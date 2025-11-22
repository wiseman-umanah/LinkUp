import { QRCodeCanvas } from "qrcode.react";
import { FaTimes, FaCopy, FaExternalLinkAlt } from "react-icons/fa";

type QrShareModalProps = {
  isOpen: boolean;
  value: string;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  ctaLabel?: string;
  onCopy?: () => void;
};

export function QrShareModal({
  isOpen,
  value,
  title = "Share link",
  subtitle,
  onClose,
  ctaLabel = "Open link",
  onCopy,
}: QrShareModalProps) {
  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      onCopy?.();
    } catch {
      // ignore copy errors
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/90 p-6 text-slate-100 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:text-white"
          >
            <FaTimes />
          </button>
        </div>
        {subtitle ? <p className="mt-2 text-sm text-slate-400">{subtitle}</p> : null}
        <div className="mt-6 flex flex-col items-center gap-4">
          <div className="rounded-3xl border border-white/10 bg-white p-4">
            <QRCodeCanvas value={value} size={220} bgColor="#ffffff" fgColor="#0c165e" includeMargin />
          </div>
          <div className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-mono text-slate-200 break-all">
            {value}
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-indigo-400/50 hover:text-white"
            >
              <FaCopy /> Copy link
            </button>
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-400 via-indigo-500 to-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg transition hover:brightness-110"
            >
              <FaExternalLinkAlt /> {ctaLabel}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QrShareModal;
