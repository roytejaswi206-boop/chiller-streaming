import { Metadata } from "next";
import { Sidebar } from "@/components/layout/Sidebar";
import { getCanonicalUrl } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Privacy Policy • CHILLER",
  description: "Privacy Policy, data handling practices, and user confidentiality commitments for CHILLER.",
  alternates: {
    canonical: getCanonicalUrl("/privacy"),
  },
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#09090c]">
      <Sidebar />

      <main className="flex-1 p-4 lg:p-8 max-w-3xl overflow-hidden text-zinc-300">
        <h1 className="text-2xl font-bold text-white tracking-tight mb-4">
          Privacy Policy
        </h1>

        <div className="space-y-4 text-xs sm:text-sm leading-relaxed">
          <p>
            Your privacy is paramount at CHILLER. We respect your confidentiality and design our architecture to minimize collected personal information.
          </p>

          <h2 className="text-base font-bold text-white mt-6 mb-2">
            1. Guest Browsing & Viewing
          </h2>
          <p>
            You can browse, search, and watch public videos without creating an account or providing identifying personal credentials.
          </p>

          <h2 className="text-base font-bold text-white mt-6 mb-2">
            2. Minimal Telemetry
          </h2>
          <p>
            We collect anonymized playback health telemetry (buffering rates, resolution switches, CDN latency) solely to maintain video playback stability and quality across origin servers.
          </p>
        </div>
      </main>
    </div>
  );
}
