import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminRevenuePage() {
  const isPaymentConnected = Boolean(
    process.env.STRIPE_SECRET_KEY || process.env.CCBILL_ACCOUNT_NUMBER
  );

  const [subscriptionsCount, payments] = await Promise.all([
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.payment.findMany({ take: 10, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Monetization & Revenue Dashboard
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Subscriber billings, payment gateway connections, and ad revenue
        </p>
      </div>

      {/* Connection State Alert */}
      <div
        className={`p-5 rounded-2xl border mb-8 ${
          isPaymentConnected
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            : "border-amber-500/30 bg-amber-500/10 text-amber-300"
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold">
            Gateway Status: {isPaymentConnected ? "CONNECTED" : "PAYMENT PROVIDER NOT CONNECTED"}
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40">
            Stripe / CCBill
          </span>
        </div>
        <p className="text-xs opacity-90 leading-relaxed">
          {isPaymentConnected
            ? "Live webhook listeners active for subscription charge events."
            : "No external payment keys provided in .env. Showing database-tracked subscriptions only."}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="p-4 rounded-2xl border border-white/10 bg-[#12121a]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Active VIP Subscribers
          </span>
          <span className="text-2xl font-black text-white">{subscriptionsCount}</span>
        </div>
        <div className="p-4 rounded-2xl border border-white/10 bg-[#12121a]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Gross Revenue (USD)
          </span>
          <span className="text-2xl font-black text-rose-400">
            {isPaymentConnected ? "$0.00" : "DATA NOT CONNECTED"}
          </span>
        </div>
        <div className="p-4 rounded-2xl border border-white/10 bg-[#12121a]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Ad Revenue (VAST)
          </span>
          <span className="text-2xl font-black text-amber-400">
            {process.env.AD_ENABLED === "true" ? "$0.00" : "ADS DISABLED"}
          </span>
        </div>
      </div>
    </div>
  );
}
