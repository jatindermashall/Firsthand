import Link from "next/link";
import { LeadForm } from "@/components/actions";
import { Icon } from "@/components/icons";
export const metadata = { title: "For businesses" };
export default function ForBusiness() {
  const ok = <Icon name="check" className="w-5 h-5 text-brand mt-0.5" />, no = <Icon name="x" className="w-5 h-5 text-danger mt-0.5" />;
  return (
    <>
      <section className="bg-ink text-[#F3EFE6]"><div className="wrap py-16 lg:py-24 grid gap-12 lg:grid-cols-2 items-center">
        <div className="flex flex-col gap-5"><span className="eyebrow !text-[#7FD1C3]">Firsthand for Business</span><h1 className="h-display text-4xl sm:text-[58px] leading-[1.04]">Pay only for new customers who actually show up.</h1><p className="text-[#C9D3D0] text-lg max-w-xl">We help your genuine customers become accountable recommenders. You pay the agreed commission only on qualified, completed bookings that can be attributed and verified.</p>
          <div className="flex flex-wrap gap-3 pt-1"><a href="#join" className="btn bg-[#F3EFE6] text-ink min-h-12 hover:bg-white">List your business</a><Link href="/merchant" className="btn text-[#F3EFE6] min-h-12 hover:bg-[#1D3D3F]">Merchant portal</Link></div></div>
        <div className="rounded-3xl bg-[#17383A] border border-[#2E4A4C] p-6 flex flex-col gap-4"><span className="text-[13px] font-semibold text-[#9FB4B1]">What a booking costs you</span>
          <dl className="flex flex-col gap-3 text-[15px]">{[["Someone views a review", "₹0"], ["Someone books a slot", "₹0"], ["They cancel or don’t show up", "₹0"]].map(([a, b]) => <div key={a} className="flex justify-between"><dt className="text-[#C9D3D0]">{a}</dt><dd className="font-semibold">{b}</dd></div>)}
            <div className="flex justify-between border-t border-[#2E4A4C] pt-3 text-base"><dt className="font-semibold">You confirm their visit</dt><dd className="font-bold text-[#7FD1C3]">Your agreed rate</dd></div></dl>
          <p className="text-[13px] text-[#9FB4B1]">Your rate is agreed in writing per category before you go live.</p></div>
      </div></section>
      <section className="wrap py-16 grid gap-10 lg:grid-cols-2">
        <div className="flex flex-col gap-4"><h2 className="h-display text-3xl">What you control</h2><ul className="flex flex-col gap-3 text-[15.5px]">{["Which services are bookable, and their prices", "Opening hours and available slots", "Confirming each visit with the customer’s code", "Public replies to every review", "A clear statement of every booking you’re billed for"].map((t) => <li key={t} className="flex gap-2.5">{ok}{t}</li>)}</ul></div>
        <div className="flex flex-col gap-4"><h2 className="h-display text-3xl">What you can’t buy</h2><ul className="flex flex-col gap-3 text-[15.5px]">{["Removal or editing of a genuine review", "A better position in ordinary search results", "Positive reviews"].map((t) => <li key={t} className="flex gap-2.5">{no}{t}</li>)}</ul><p className="text-muted">That’s what makes customers believe the good ones.</p></div>
      </section>
      <section id="join" className="bg-paper border-t border-line scroll-mt-20"><div className="wrap py-16 grid gap-10 lg:grid-cols-[1fr_480px] items-start">
        <div className="flex flex-col gap-4"><span className="eyebrow">Pilot — Chandigarh, Mohali, Ludhiana, Manali, Kasauli</span><h2 className="h-display text-3xl sm:text-4xl">Join the first group of partner businesses.</h2><p className="text-muted max-w-lg">Tell us about your business and we’ll call to agree your commission rate and set up your services. No fee to join.</p></div>
        <LeadForm />
      </div></section>
    </>
  );
}
