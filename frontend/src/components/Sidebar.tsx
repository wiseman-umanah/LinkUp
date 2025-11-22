import { Fragment } from "react";
import {
  PiSquaresFourDuotone,
  PiReceiptDuotone,
  PiUserCircleDuotone,
  PiSlidersDuotone,
} from "react-icons/pi";
import { MdOutlineKey } from "react-icons/md";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export type SidebarSection = "payment" | "transactions" | "settings" | "profile" | "api";

interface SidebarProps {
  active: SidebarSection;
  onSelect: (section: SidebarSection) => void;
  onClose?: () => void;
  mobile?: boolean;
}

const navItems: { key: SidebarSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "payment", label: "Payment Links", icon: PiSquaresFourDuotone },
  { key: "transactions", label: "Transactions", icon: PiReceiptDuotone },
  { key: "profile", label: "Profile", icon: PiUserCircleDuotone },
  { key: "settings", label: "Settings", icon: PiSlidersDuotone },
  { key: "api", label: "API", icon: MdOutlineKey },
];

export default function Sidebar({ active, onSelect, onClose, mobile = false }: SidebarProps) {
	const { logout } = useAuth();
	  const navigate = useNavigate();
	
  const baseClasses = mobile
    ? "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/10 bg-slate-950/95 px-6 pb-10 pt-14 backdrop-blur"
    : "relative hidden min-h-screen w-72 flex-col border-r border-white/10 bg-white/5 px-6 pb-10 pt-14 backdrop-blur lg:flex";


  return (
    <aside className={baseClasses}>
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-indigo-500/15 to-transparent" />

	  <div className="flex flex-col h-full justify-between">
      <div className="relative space-y-10">
        <div className="space-y-3">
          <div className="inline-flex items-center justify-between gap-3">
            <div className="inline-flex items-center rounded-full border border-indigo-400/40 bg-indigo-500/15 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-indigo-200">
              LinkUp
            </div>
            {mobile && onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 hover:border-white/30 hover:text-white"
              >
                Close
              </button>
            ) : null}
          </div>
          <h2 className="text-2xl font-semibold text-white">Merchant console</h2>
          <p className="text-sm text-slate-400">Manage your Hedera payment infrastructure from one glossy dashboard.</p>
        </div>

        <nav className="space-y-1">
          {navItems.map(({ key, label, icon: Icon }) => {
            const isActive = key === active;
            return (
              <Fragment key={key}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(key);
                    if (mobile && onClose) onClose();
                  }}
                  className={`group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-indigo-500 text-slate-950 shadow-[0_12px_40px_-18px_rgba(20,184,166,0.6)]"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                      isActive
                        ? "border-white/20 bg-white/10 text-white"
                        : "border-white/5 bg-white/0 text-indigo-300 group-hover:border-indigo-300/40 group-hover:bg-indigo-500/10"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  {label}
                </button>
                {key === "payment" ? <hr className="border-white/5" /> : null}
              </Fragment>
            );
          })}
        </nav>
      </div>
		<div>
			<button
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition text-slate-300 hover:bg-indigo-500 border border-indigo-500 shadow-[0_12px_40px_-18px_rgba(20,184,166,0.6)]"
                onClick={async () => {
                  await logout();
                  navigate("/");
                }}
              >
                Sign out
              </button>
			<footer className="relative mt-10 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-400">
				<p className="font-semibold text-white">Need help?</p>
				<p className="mt-1">Read our Hedera integration playbook or reach out to the LinkUp team.</p>
			</footer>
		</div>
	  </div>
    </aside>
  );
}
