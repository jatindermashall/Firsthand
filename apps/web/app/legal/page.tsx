export const metadata = { title: "Terms, privacy and disclosures" };
const DOCS = [["Consumer Terms", "Using Firsthand to browse, book and review"], ["Recommender Terms", "Eligibility, disclosures and how commissions are earned"], ["Merchant Terms", "Listing, commission, settlement and disputes"], ["Privacy Notice", "What we collect, why, how long we keep it and your choices"], ["Community Rules", "What’s allowed in reviews, questions, answers and messages"], ["Affiliate Disclosures", "How and where commission connections are shown"], ["Booking, Cancellation & Refund Policy", "Who refunds what, and when"], ["Payout Terms", "Minimum payout, tax withholding, reversals and reserves"], ["Anti-fraud & Appeals", "How we investigate and how to appeal a decision"]];
export default function Legal() {
  return (
    <div className="wrap py-12 pb-16 flex flex-col gap-8 max-w-4xl">
      <div className="flex flex-col gap-3"><span className="eyebrow">Policies</span><h1 className="h-display text-4xl sm:text-5xl">Terms, privacy and disclosures</h1><p className="text-muted text-lg">Firsthand is in a pilot preview. These documents are being prepared with qualified Indian counsel and will be published here before public launch.</p></div>
      <ul className="card overflow-hidden">{DOCS.map(([n, d]) => <li key={n} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-t border-line-soft first:border-t-0"><div><strong className="font-semibold">{n}</strong><span className="block text-sm text-muted">{d}</span></div><span className="pill bg-amber-soft text-amber-ink">In preparation</span></li>)}</ul>
      <div className="card p-6 flex flex-col gap-2"><h2 className="font-semibold text-lg">During the preview</h2><p className="text-muted">Listings, people and amounts shown are sample data. Don’t upload real personal documents yet. To ask about your data or have it deleted, use the contact on the business page or write to the Firsthand team.</p></div>
    </div>
  );
}
