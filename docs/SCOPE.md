# Scope of the first build (pilot preview, 14 Nov 2026)

Built against the business plan's P0 "trust & transaction" scope plus Guides phase A and profile ratings.

## In this build
**Visitors**
- Home, explore with search, city, category, "visit-confirmed only" and sort; ranking uses match, proof level, recency, helpfulness and Trust Score — never commission; protected visibility for new profiles.
- Experience page: commission disclosure, verification badge, pros/cons, who it suits, practical notes, business reply, Q&A, helpful, save, copy link, report.
- Booking: real hourly availability from opening hours, one booking per slot, 6-digit check-in code, pay at venue, free cancellation before the slot.
- After a confirmed visit: "Did it match what [recommender] said?" (Yes / Mostly / No) and a prompt to share a review.
- Business pages, recommender storefronts with Trust Score breakdown and tier.

**Recommenders**
- Email sign-in with one-time code (code shown on screen until SMTP is set), profile, "open for questions".
- Share an experience in 4 steps with three proof routes: Firsthand booking (auto-published, confirmed badge), business confirms the visit, or receipt upload (private, moderator reviewed, no commission).
- Earnings wallet: estimated → pending settlement (7-day refund window) → payable → in payout → paid; reversals on cancellation; payout requests from ₹500.
- Direct messages (opt-in), phone/email/WhatsApp links masked automatically.

**Businesses** (merchant portal)
- Confirm visits by code (on the day only), visit-confirmation requests, public replies to reviews (no edit/delete), services add/pause, monthly commission owed and statement.

**Team** (admin console, unlocked with `ADMIN_ACCESS_KEY`)
- Verification queue with signals and logged evidence viewing, approve with badge level or reject with reason; reports (dismiss/uphold); payouts (mark paid/reject); release due commissions; business leads; add businesses and owners; append-only audit log.

## Not in this build (next phases in the plan)
- Real payments/collection and bank payouts (payouts are recorded and marked paid manually), KYC, TDS calculation.
- SMS/WhatsApp OTP, email notifications.
- Photo/video uploads on reviews (placeholders shown), maps.
- Recorded calls and paid Guide sessions (Guides phases B and C), collections, plan-together, price alerts, Experience DNA, AI features.
- Hotel/activity supplier integrations, React Native app, Hindi/Punjabi.
- Legal documents (listed on /legal as in preparation).

## Decisions still open (placeholders in code)
Trust Score weights and tier thresholds, recommender share (35%), refund window (7 days), minimum payout (₹500), per-business commission rates (sample 10–15%).
