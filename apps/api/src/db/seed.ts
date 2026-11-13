import { sql } from "drizzle-orm";
import { db, schema } from "../lib/db.js";
import { platformCommission, recommenderShare } from "../lib/money.js";
import { config } from "../lib/config.js";

/** Sample pilot data so the preview isn't empty. Every business is flagged isSample and every person isDemo. */
export async function seedIfEmpty(log: (m: string) => void) {
  const [{ n }] = (await db.select({ n: sql<number>`count(*)` }).from(schema.businesses)) as any;
  if (Number(n) > 0 || !config.seedDemo) return;
  log("Seeding sample pilot data");
  const DAY = 864e5, now = Date.now();
  let seq = 0;
  const rand = () => { seq = (seq * 9301 + 49297) % 233280; return seq / 233280; };

  const B = async (v: { slug: string; name: string; category: (typeof schema.CATEGORIES)[number]; city: string; area: string; description: string; hoursText: string; commissionBps: number; open?: number; close?: number }, svcs: [string, number, number, string?][]) => {
    const r = await db.insert(schema.businesses).values({ ...v, openHour: v.open ?? 10, closeHour: v.close ?? 19, isSample: true }).$returningId();
    const id = r[0]!.id;
    const ids: number[] = [];
    for (const [name, rupees, durationMin, unit] of svcs) {
      const s = await db.insert(schema.services).values({ businessId: id, name, pricePaise: rupees * 100, durationMin, unit }).$returningId();
      ids.push(s[0]!.id);
    }
    return { id, svc: ids, bps: v.commissionBps, prices: svcs.map((s) => s[1] * 100) };
  };

  const saffron = await B({ slug: "saffron-lane-salon", name: "Saffron Lane Salon", category: "salon", city: "Chandigarh", area: "Sector 17", description: "Hair, skin and nails in Sector 17 market.", hoursText: "Mon–Sat 10:00–20:00 · Sun 11:00–18:00", commissionBps: 1500 },
    [["Keratin smoothing", 4500, 180], ["Haircut and blow-dry", 900, 60], ["Global hair colour", 3800, 120], ["Hair spa", 1500, 60], ["Beard and cut", 500, 45]]);
  const pine = await B({ slug: "pine-view-homestay-kasauli", name: "Pine-view Homestay", category: "stay", city: "Kasauli", area: "Upper Mall Road", description: "Three-room family homestay with home-cooked meals.", hoursText: "Check-in 12:00 · Check-out 11:00", commissionBps: 1200, open: 12, close: 18 },
    [["Room for two, per night", 3200, 1440, "per night"], ["Family room, per night", 4800, 1440, "per night"]]);
  const river = await B({ slug: "riverside-cottage-old-manali", name: "Riverside Cottage", category: "stay", city: "Manali", area: "Old Manali", description: "Wooden cottage by the Manalsu river.", hoursText: "Check-in 13:00 · Check-out 11:00", commissionBps: 1200, open: 13, close: 18 },
    [["Cottage for two, per night", 3500, 1440, "per night"]]);
  const spa = await B({ slug: "calm-room-spa-mohali", name: "Calm Room Spa", category: "wellness", city: "Mohali", area: "Phase 7", description: "Massage and reflexology.", hoursText: "Daily 10:00–20:00", commissionBps: 1500 },
    [["Deep-tissue massage, 60 min", 2200, 60], ["Foot reflexology, 45 min", 1200, 45]]);
  const glide = await B({ slug: "solang-sky-gliders", name: "Solang Sky Gliders", category: "activity", city: "Manali", area: "Solang Valley", description: "Tandem paragliding with certified pilots.", hoursText: "Daily 09:00–16:00, weather permitting", commissionBps: 1500, open: 9, close: 16 },
    [["Tandem paragliding, long flight", 3000, 30], ["Tandem paragliding, short flight", 1800, 15]]);
  const thali = await B({ slug: "courtyard-thali-house-ludhiana", name: "Courtyard Thali House", category: "food", city: "Ludhiana", area: "Sarabha Nagar", description: "Punjabi thalis and family packages.", hoursText: "Daily 12:00–23:00", commissionBps: 1000, open: 12, close: 22 },
    [["Family thali package for 4", 2400, 90]]);
  const physio = await B({ slug: "straightback-physio-chandigarh", name: "Straightback Physio", category: "wellness", city: "Chandigarh", area: "Sector 8", description: "Physiotherapy clinic.", hoursText: "Mon–Sat 09:00–19:00", commissionBps: 1200, open: 9 },
    [["Assessment and session", 1000, 60]]);
  const polish = await B({ slug: "polish-studio-sector-35", name: "Polish Studio", category: "salon", city: "Chandigarh", area: "Sector 35", description: "Nail studio.", hoursText: "Daily 11:00–20:00", commissionBps: 1500, open: 11 },
    [["Gel manicure", 1200, 60]]);
  const mane = await B({ slug: "mane-street-mohali", name: "Mane Street", category: "salon", city: "Mohali", area: "Phase 7", description: "Neighbourhood hair salon.", hoursText: "Tue–Sun 10:00–20:00", commissionBps: 1500 },
    [["Haircut and blow-dry", 800, 45]]);

  const U = async (email: string, name: string | null, handle: string | null, city: string, bio?: string, open = false) => {
    const r = await db.insert(schema.users).values({ email: `${email}@demo.firsthand.local`, name, handle, city, bio, openForQuestions: open, isDemo: true, createdAt: new Date(now - 200 * DAY) }).$returningId();
    return r[0]!.id;
  };
  const simran = await U("simran", "Simran K.", "simran.tricity", "Chandigarh", "Salon regular with very opinionated hair. Weekend escapes to the hills. I write what I'd tell a friend — including when it wasn't worth it.", true);
  const aman = await U("aman", "Aman R.", "aman.r", "Mohali", "Family trips to the hills, usually with grandparents and a dog.", true);
  const harpreet = await U("harpreet", "Harpreet S.", "harpreet.s", "Mohali");
  const karan = await U("karan", "Karan M.", "karan.m", "Chandigarh", "Weekend adventure, weekday desk job.");
  const ritika = await U("ritika", "Ritika P.", "ritika.p", "Ludhiana");
  const dev = await U("dev", "Dev A.", "dev.a", "Chandigarh");
  const mehak = await U("mehak", "Mehak J.", "mehak.j", "Mohali");
  const rohan = await U("rohan", "Rohan V.", "rohan.v", "Chandigarh", "Everything is amazing!");
  const ananya = await U("ananya", "Ananya S.", "ananya.s", "Ludhiana");
  const gurleen = await U("gurleen", "Gurleen B.", "gurleen.b", "Chandigarh");
  const arjun = await U("arjun", "Arjun T.", "arjun.t", "Panchkula");
  const neha = await U("neha", "Neha S.", "neha.saffron", "Chandigarh");
  await db.insert(schema.businessMembers).values({ businessId: saffron.id, userId: neha });
  const visitorNames = ["Priya M.", "Anjali S.", "Rohit V.", "Kavya D.", "Ishaan G.", "Navneet K.", "Tanya B.", "Sahil C.", "Jasleen W.", "Manpreet D.", "Aarav J.", "Simar P.", "Vikram L.", "Nidhi R.", "Kunal A.", "Rhea T.", "Yuvraj S.", "Pooja N.", "Gagan H.", "Mehr O."];
  const visitors: number[] = [];
  for (const [i, n] of visitorNames.entries()) visitors.push(await U(`visitor${i + 1}`, n, `visitor.${i + 1}`, ["Chandigarh", "Mohali", "Ludhiana", "Panchkula"][i % 4]!));

  type Exp = { author: number; biz: typeof saffron; svc: number; title: string; story: string; pros: string; cons: string; suits: string; rating: number; level: number; days: number; parking?: string; access?: string; price?: string; who?: string; proof?: "firsthand_booking" | "business_confirm" | "receipt" };
  const exps: Record<string, number> = {};
  const X = async (key: string, e: Exp) => {
    const r = await db.insert(schema.experiences).values({
      slug: key, authorId: e.author, businessId: e.biz.id, serviceId: e.biz.svc[e.svc], title: e.title, story: e.story, pros: e.pros, cons: e.cons, suits: e.suits,
      ratingX10: e.rating * 10, level: e.level, status: "published", proofType: e.proof ?? (e.level >= 2 ? "firsthand_booking" : "receipt"),
      visitedOn: new Date(now - (e.days + 3) * DAY).toISOString().slice(0, 10), publishedAt: new Date(now - e.days * DAY), createdAt: new Date(now - e.days * DAY),
      parking: e.parking, access: e.access, pricePaid: e.price, whoFor: e.who ?? "Just me",
    }).$returningId();
    exps[key] = r[0]!.id;
  };

  await X("keratin-smoothing-saffron-lane-salon", { author: simran, biz: saffron, svc: 0, title: "Keratin smoothing at Saffron Lane Salon", rating: 4.5, level: 2, days: 14,
    story: "My hair is thick and frizzy, and I've had keratin done at three places in the tricity. Neha took time to check the ends before starting and was honest that one session wouldn't fix the damage. It took about 3 hours — they quoted 2 — so don't book it before anything important. Three washes in, the result is smooth without looking flat.",
    pros: "Honest consultation before starting\nResult held up after three washes\nClean stations, fresh towels", cons: "Took an hour longer than quoted\nAftercare shampoo pushed at the counter\nWeekend slots fill fast",
    suits: "Thick or frizzy hair, First-time keratin, Weekday visits", parking: "Market parking, busy after 5 pm", access: "Ground floor, one step at entrance", price: "₹4,500 incl. taxes" });
  await X("riverside-cottage-old-manali-2-nights", { author: simran, biz: river, svc: 0, title: "Riverside Cottage, 2 nights", rating: 4, level: 3, days: 60, who: "Friends",
    story: "You hear the river all night, which we loved. The cottage is clean and the caretaker cooked rajma-chawal on request. The room heater is weak for late October — ask for a second blanket before it gets cold. The last stretch is a steep walk with luggage.",
    pros: "Right on the river\nCaretaker cooked on request\nQuiet at night", cons: "Weak heater\nSteep walk with luggage", suits: "Couples, Friends, Light packers" });
  await X("gel-manicure-polish-studio", { author: simran, biz: polish, svc: 0, title: "Gel manicure at Polish Studio", rating: 2, level: 2, days: 95,
    story: "Chipped in four days, on two nails. Staff were polite but clearly rushed — the cuticle work was skipped. They offered a fix but I didn't have time to go back. I wouldn't go back for gel; maybe fine for a quick polish.",
    pros: "Polite staff\nOn time", cons: "Chipped in four days\nRushed cuticle work", suits: "Quick polish only" });
  await X("pine-view-homestay-kasauli-2-nights", { author: aman, biz: pine, svc: 1, title: "Pine-view Homestay, 2 nights", rating: 4, level: 3, days: 21, who: "Family",
    story: "Quiet, spotless and the hosts cooked dinner on request. Road is steep in the last 200 m — fine in a hatchback, not great in rain. Grandparents were comfortable; the ground-floor room has no steps.",
    pros: "Very clean\nHome-cooked dinner\nGround-floor room for elders", cons: "Steep last stretch of road\nPatchy mobile signal", suits: "Families, Elderly parents, Pets on request", parking: "One car at the house, a second on the road above" });
  await X("deep-tissue-massage-calm-room-spa", { author: harpreet, biz: spa, svc: 0, title: "Deep-tissue massage, 60 min", rating: 3, level: 2, days: 7,
    story: "Therapist was skilled and listened about my shoulder, but the room was cold and the shower barely warm. Book a morning slot — the evening rush means they hurry the last 10 minutes.",
    pros: "Skilled therapist\nAsked about problem areas", cons: "Cold room\nLukewarm shower\nRushed in the evening", suits: "Desk-job back pain, Morning visits" });
  await X("tandem-paragliding-long-flight-solang", { author: karan, biz: glide, svc: 0, title: "Tandem paragliding, long flight", rating: 4.5, level: 2, days: 30, who: "Friends",
    story: "Wait was 90 minutes on a Saturday. Go on a weekday before 10 when the wind is calmer. The pilot was calm and walked us through landing twice. Worth it — the GoPro video is extra and not great value.",
    pros: "Calm, experienced pilot\nClear safety briefing", cons: "Long weekend queues\nVideo add-on overpriced", suits: "First-timers, Weekday mornings" });
  await X("family-thali-package-courtyard-thali-house", { author: ritika, biz: thali, svc: 0, title: "Family thali package for 4", rating: 4, level: 1, days: 5, who: "Family",
    story: "Generous portions and the dal makhani was excellent; dessert was ordinary. Good value for a group, and they didn't rush us out on a busy Sunday.",
    pros: "Generous portions\nGreat dal makhani", cons: "Ordinary dessert", suits: "Families, Groups" });
  await X("physio-session-straightback", { author: dev, biz: physio, svc: 0, title: "Physio session for back pain", rating: 5, level: 2, days: 4,
    story: "Proper assessment before any treatment, and clear home exercises written down. Felt a real difference after the second visit. Parking is hard after 6 pm.",
    pros: "Thorough assessment\nWritten home exercises", cons: "Parking after 6 pm", suits: "Desk-job back pain" });
  await X("haircut-mane-street-mohali", { author: mehak, biz: mane, svc: 0, title: "Haircut and blow-dry at Mane Street", rating: 5, level: 2, days: 6,
    story: "Listened to what I wanted instead of doing their usual layers. Quick, tidy and fairly priced.", pros: "Listened properly\nFair price", cons: "Small waiting area", suits: "Simple cuts" });
  await X("haircut-saffron-lane-mehak", { author: mehak, biz: saffron, svc: 1, title: "Haircut and blow-dry at Saffron Lane Salon", rating: 5, level: 2, days: 10,
    story: "Booked through Firsthand after reading Simran's review. They asked the right questions and didn't push products. Will go back.", pros: "No product pushing\nGood consultation", cons: "Pricier than my old place", suits: "Anyone who wants to be listened to" });
  await X("hair-colour-saffron-lane-gurleen", { author: gurleen, biz: saffron, svc: 2, title: "Global hair colour at Saffron Lane Salon", rating: 2.5, level: 2, days: 25,
    story: "Shade came out warmer than the swatch. They offered a free toner, which helped, but it took a second visit to get it right.", pros: "Offered a free fix", cons: "Shade didn't match swatch\nNeeded a second visit", suits: "People open to a toner session" });
  await X("beard-and-cut-saffron-lane-arjun", { author: arjun, biz: saffron, svc: 4, title: "Beard and cut at Saffron Lane Salon", rating: 4, level: 1, days: 50,
    story: "Quick and tidy. Walk-ins wait — book ahead on Sundays.", pros: "Quick\nTidy beard line", cons: "Long walk-in wait on Sundays", suits: "Quick grooming" });
  await X("thali-ananya-courtyard", { author: ananya, biz: thali, svc: 0, title: "Sunday lunch at Courtyard Thali House", rating: 4, level: 2, days: 2, who: "Family",
    story: "First time here with my parents. Service was warm and they made a less spicy version for my mother without fuss. The courtyard seating is lovely in winter afternoons.",
    pros: "Adjusted spice level\nLovely courtyard", cons: "Busy at 1:30 pm", suits: "Families with elders" });
  for (const [key, biz, svc, days] of [["hair-spa-saffron-rohan", saffron, 3, 40], ["massage-calm-room-rohan", spa, 0, 70], ["pine-view-rohan", pine, 0, 100]] as const) {
    await X(key, { author: rohan, biz, svc, title: `${["Hair spa", "Massage", "Weekend stay"][[saffron, spa, pine].indexOf(biz)]} — absolutely amazing!`, rating: 5, level: 1, days,
      story: "Absolutely amazing experience, best in the city, everything was perfect and the staff were wonderful. Must visit! Five stars all the way, you won't regret it at all.",
      pros: "Everything", cons: "", suits: "Everyone" });
  }

  // Pending submissions so the merchant and admin queues aren't empty.
  await db.insert(schema.experiences).values([
    { slug: "pending-beard-saffron", authorId: arjun, businessId: saffron.id, serviceId: saffron.svc[4], title: "Beard trim at Saffron Lane Salon", story: "Second visit for a beard trim. Same barber, consistent result, and they remembered my preferred length without asking.", ratingX10: 40, visitedOn: new Date(now - 2 * DAY).toISOString().slice(0, 10), status: "pending", proofType: "business_confirm", createdAt: new Date(now - DAY) },
    { slug: "pending-reflexology-calm-room", authorId: ritika, businessId: spa.id, serviceId: spa.svc[1], title: "Foot reflexology at Calm Room Spa", story: "Booked after a long week of standing at work. Relaxing, though the room next door was noisy. Worth it for the price on a weekday.", ratingX10: 35, visitedOn: new Date(now - 3 * DAY).toISOString().slice(0, 10), status: "pending", proofType: "receipt", createdAt: new Date(now - 5 * 36e5) },
  ]);

  // Completed bookings that came from recommendations, each with the visitor's "did it match?" answer.
  const BK = async (user: number, biz: typeof saffron, svc: number, rec: number | null, expKey: string | null, daysAgo: number, accuracy: number | null, status: "completed" | "confirmed" = "completed", hour = 11) => {
    const slot = new Date(now - daysAgo * DAY); slot.setUTCMinutes(0, 0, 0); slot.setUTCHours(hour - 5, 30);
    const r = await db.insert(schema.bookings).values({
      code: String(100000 + Math.floor(rand() * 899999)), userId: user, businessId: biz.id, serviceId: biz.svc[svc]!, experienceId: expKey ? exps[expKey] : null, recommenderId: rec,
      slotAt: slot, pricePaise: biz.prices[svc]!, status, accuracy, accuracyAt: accuracy === null ? null : new Date(slot.getTime() + DAY),
      completedAt: status === "completed" ? slot : null, createdAt: new Date(slot.getTime() - 3 * DAY),
    }).$returningId();
    const id = r[0]!.id;
    if (rec) {
      const platform = platformCommission(biz.prices[svc]!, biz.bps), amount = recommenderShare(platform);
      const st = status === "confirmed" ? "estimated" : daysAgo > config.settleDays ? "payable" : "pending_settlement";
      const c = await db.insert(schema.commissions).values({ bookingId: id, recommenderId: rec, platformPaise: platform, amountPaise: amount, status: st, settleAfter: status === "completed" ? new Date(slot.getTime() + config.settleDays * DAY) : null, createdAt: new Date(slot.getTime() - 3 * DAY) }).$returningId();
      await db.insert(schema.ledgerEntries).values({ commissionId: c[0]!.id, userId: rec, toStatus: st, amountPaise: amount, note: "Sample data" });
    }
    return id;
  };
  const pick = (i: number) => visitors[i % visitors.length]!;
  // Simran: 22 ratings, 21 matched, 1 mostly.
  for (let i = 0; i < 22; i++) {
    const [biz, svc, key] = i % 3 === 0 ? [river, 0, "riverside-cottage-old-manali-2-nights"] as const : i % 7 === 0 ? [polish, 0, "gel-manicure-polish-studio"] as const : [saffron, i % 2, "keratin-smoothing-saffron-lane-salon"] as const;
    await BK(pick(i), biz, svc, simran, key, 3 + i * 4, i === 9 ? 1 : 2);
  }
  // Aman: 6, all matched. Harpreet: 5, mixed. Karan: 4. Dev: 3. Mehak: 2.
  for (let i = 0; i < 6; i++) await BK(pick(i + 3), pine, i % 2, aman, "pine-view-homestay-kasauli-2-nights", 4 + i * 6, 2);
  for (let i = 0; i < 5; i++) await BK(pick(i + 6), spa, 0, harpreet, "deep-tissue-massage-calm-room-spa", 2 + i * 3, i < 3 ? 2 : 1);
  for (let i = 0; i < 4; i++) await BK(pick(i + 9), glide, 0, karan, "tandem-paragliding-long-flight-solang", 5 + i * 5, i ? 2 : 1);
  for (let i = 0; i < 3; i++) await BK(pick(i + 12), physio, 0, dev, "physio-session-straightback", 1 + i, 2);
  for (let i = 0; i < 2; i++) await BK(pick(i + 15), mane, 0, mehak, "haircut-mane-street-mohali", 2 + i, 2);
  // Rohan: 18 ratings — visitors often said his reviews oversold.
  for (let i = 0; i < 18; i++) await BK(pick(i + 2), [saffron, spa, pine][i % 3]!, [3, 0, 0][i % 3]!, rohan, ["hair-spa-saffron-rohan", "massage-calm-room-rohan", "pine-view-rohan"][i % 3]!, 5 + i * 5, i < 7 ? 2 : i < 15 ? 1 : 0);
  // Upcoming bookings at Saffron Lane for the merchant demo (today and tomorrow, IST).
  const istToday = new Date(now + 330 * 6e4).toISOString().slice(0, 10);
  const up = async (user: number, svc: number, rec: number | null, key: string | null, dayOffset: number, hour: number) => {
    const [y, m, d] = istToday.split("-").map(Number);
    const slot = new Date(Date.UTC(y!, m! - 1, d! + dayOffset, hour, 0) - 330 * 6e4);
    const r = await db.insert(schema.bookings).values({ code: String(100000 + Math.floor(rand() * 899999)), userId: user, businessId: saffron.id, serviceId: saffron.svc[svc]!, experienceId: key ? exps[key] : null, recommenderId: rec, slotAt: slot, pricePaise: saffron.prices[svc]! }).$returningId();
    if (rec) {
      const platform = platformCommission(saffron.prices[svc]!, saffron.bps), amount = recommenderShare(platform);
      await db.insert(schema.commissions).values({ bookingId: r[0]!.id, recommenderId: rec, platformPaise: platform, amountPaise: amount, status: "estimated" });
    }
  };
  await up(visitors[0]!, 1, mehak, "haircut-saffron-lane-mehak", 1, 10);
  await up(visitors[1]!, 0, simran, "keratin-smoothing-saffron-lane-salon", 1, 12);
  await up(visitors[2]!, 4, null, null, 1, 14);
  await up(visitors[3]!, 3, simran, "keratin-smoothing-saffron-lane-salon", 2, 16);

  // One past payout for Simran so the wallet shows a full history.
  const payable = await db.select().from(schema.commissions).where(sql`${schema.commissions.recommenderId} = ${simran} and ${schema.commissions.status} = 'payable'`).orderBy(schema.commissions.createdAt);
  const paid = payable.slice(0, 12);
  if (paid.length) {
    const total = paid.reduce((s, c) => s + c.amountPaise, 0);
    const p = await db.insert(schema.payouts).values({ userId: simran, amountPaise: total, status: "paid", reference: "FH-PO-0001", createdAt: new Date(now - 20 * DAY), paidAt: new Date(now - 18 * DAY) }).$returningId();
    for (const c of paid) await db.update(schema.commissions).set({ status: "paid", payoutId: p[0]!.id }).where(sql`${schema.commissions.id} = ${c.id}`);
  }

  // Helpful votes, questions and answers.
  const votes: [string, number][] = [["keratin-smoothing-saffron-lane-salon", 14], ["riverside-cottage-old-manali-2-nights", 8], ["gel-manicure-polish-studio", 9], ["pine-view-homestay-kasauli-2-nights", 12], ["deep-tissue-massage-calm-room-spa", 6], ["tandem-paragliding-long-flight-solang", 7], ["physio-session-straightback", 5], ["hair-colour-saffron-lane-gurleen", 4], ["hair-spa-saffron-rohan", 1], ["pine-view-rohan", 1], ["family-thali-package-courtyard-thali-house", 3]];
  for (const [key, n] of votes) for (let i = 0; i < n; i++) await db.insert(schema.helpfulVotes).values({ experienceId: exps[key]!, userId: visitors[i]! }).onDuplicateKeyUpdate({ set: { userId: visitors[i]! } });
  const Q = async (key: string, asker: number, body: string, answer: [number, string] | null) => {
    const r = await db.insert(schema.questions).values({ experienceId: exps[key]!, askerId: asker, body, createdAt: new Date(now - 3 * DAY) }).$returningId();
    if (answer) await db.insert(schema.answers).values({ questionId: r[0]!.id, authorId: answer[0], body: answer[1], createdAt: new Date(now - 2 * DAY) });
  };
  await Q("keratin-smoothing-saffron-lane-salon", visitors[4]!, "Is it safe for colour-treated hair?", [simran, "Mine was coloured two months before. They did a strand test first and it was fine."]);
  await Q("pine-view-homestay-kasauli-2-nights", visitors[5]!, "Is there parking for two cars, and do they allow pets?", [aman, "Space for one car at the house, a second fits on the road above. Our dog stayed with us — they asked for a ₹500 cleaning deposit."]);
  await Q("riverside-cottage-old-manali-2-nights", visitors[6]!, "Can you hear the road at night?", [simran, "No road noise, only the river. Light sleepers should bring earplugs anyway."]);
  await Q("tandem-paragliding-long-flight-solang", visitors[7]!, "Is there a weight limit?", null);
  await db.update(schema.experiences).set({ businessReply: "Thank you, Simran. You're right about the timing — we now quote 2.5–3 hours for thick hair. Aftercare products are optional.", businessReplyAt: new Date(now - 10 * DAY) }).where(sql`${schema.experiences.id} = ${exps["keratin-smoothing-saffron-lane-salon"]}`);
  await db.update(schema.experiences).set({ businessReply: "We're sorry the shade missed. We've added a strand test to every colour booking.", businessReplyAt: new Date(now - 20 * DAY) }).where(sql`${schema.experiences.id} = ${exps["hair-colour-saffron-lane-gurleen"]}`);
  await db.insert(schema.auditEvents).values({ entityType: "system", action: "sample_data_seeded" });
  log("Sample data ready");
}
