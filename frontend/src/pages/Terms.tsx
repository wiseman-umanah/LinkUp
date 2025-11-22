import { Link } from "react-router-dom";
import { Seo } from "../components/Seo";

export default function TermsOfService() {
  const appUrl =
    import.meta.env.VITE_APP_URL ??
    (typeof window !== "undefined" ? window.location.origin : "https://linkup.example");
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "LinkUp Terms of Service",
    url: `${appUrl.replace(/\/$/, "")}/terms`,
    description:
      "Terms of Service outlining acceptable use, responsibilities, and liabilities for the LinkUp Hedera payment platform.",
    isPartOf: {
      "@type": "WebSite",
      url: appUrl,
      name: "LinkUp",
    },
  };

  return (
    <>
      <Seo
        title="Terms of Service"
        description="Review LinkUp's Terms of Service to understand acceptable use, merchant responsibilities, and platform safeguards."
        structuredData={structuredData}
        keywords={["LinkUp terms", "Hedera payment terms", "crypto payment compliance", "merchant responsibilities"]}
        canonical={`${appUrl.replace(/\/$/, "")}/terms`}
      />
      <div className="min-h-screen bg-slate-950 text-slate-200">
        <div className="mx-auto max-w-4xl px-6 py-16 space-y-8">
          <header className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#9ea6ff]/80">LinkUp</p>
            <h1 className="text-3xl font-semibold text-white">Terms of Service</h1>
            <p className="text-sm text-slate-400">Last updated: October 2025</p>
        </header>

        <section className="space-y-6 text-sm leading-relaxed text-slate-300">
          <p>
            LinkUp provides tooling for creating and managing Hedera payment links. By using our product you
            agree to act responsibly with customer data, comply with the Hedera network terms, and respect local laws
            regarding digital asset payments.
          </p>
          <p>
            We reserve the right to suspend access in the event of suspicious activity, smart contract misuse, or
            violation of these terms. LinkUp is provided without warranty; please audit contracts and review transactions
            before approving them in your wallet.
          </p>
          <p>
            Questions? <Link to="/privacy" className="text-[#b5bffe] hover:text-[#d7dbff]">Review our privacy policy</Link>{" "}
            or contact the LinkUp team through your workspace onboarding email.
          </p>
        </section>

        <footer>
          <Link to="/" className="text-sm font-semibold text-[#b5bffe] hover:text-[#d7dbff]">Return to LinkUp</Link>
        </footer>
      </div>
      </div>
    </>
  );
}
