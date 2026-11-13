import {
  mysqlTable, bigint, varchar, text, int, tinyint, boolean, datetime, date, mysqlEnum,
  primaryKey, uniqueIndex, index,
} from "drizzle-orm/mysql-core";

const id = (name = "id") => bigint(name, { mode: "number", unsigned: true }).autoincrement().primaryKey();
const ref = (name: string) => bigint(name, { mode: "number", unsigned: true });
const now = (name: string) => datetime(name, { mode: "date" }).notNull().$defaultFn(() => new Date());

export const CATEGORIES = ["salon", "stay", "wellness", "activity", "food"] as const;

export const users = mysqlTable("users", {
  id: id(),
  email: varchar("email", { length: 191 }).notNull(),
  name: varchar("name", { length: 80 }),
  handle: varchar("handle", { length: 40 }),
  city: varchar("city", { length: 60 }),
  bio: varchar("bio", { length: 400 }),
  openForQuestions: boolean("open_for_questions").notNull().default(false),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: now("created_at"),
}, (t) => [uniqueIndex("users_email_uq").on(t.email), uniqueIndex("users_handle_uq").on(t.handle)]);

export const otpCodes = mysqlTable("otp_codes", {
  id: id(),
  email: varchar("email", { length: 191 }).notNull(),
  codeHash: varchar("code_hash", { length: 64 }).notNull(),
  attempts: int("attempts").notNull().default(0),
  expiresAt: datetime("expires_at", { mode: "date" }).notNull(),
  usedAt: datetime("used_at", { mode: "date" }),
  createdAt: now("created_at"),
}, (t) => [index("otp_email_idx").on(t.email)]);

export const sessions = mysqlTable("sessions", {
  tokenHash: varchar("token_hash", { length: 64 }).primaryKey(),
  userId: ref("user_id").notNull(),
  adminUntil: datetime("admin_until", { mode: "date" }),
  expiresAt: datetime("expires_at", { mode: "date" }).notNull(),
  createdAt: now("created_at"),
}, (t) => [index("sessions_user_idx").on(t.userId)]);

export const businesses = mysqlTable("businesses", {
  id: id(),
  slug: varchar("slug", { length: 120 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  category: mysqlEnum("category", CATEGORIES).notNull(),
  city: varchar("city", { length: 60 }).notNull(),
  area: varchar("area", { length: 120 }),
  description: varchar("description", { length: 600 }),
  hoursText: varchar("hours_text", { length: 200 }),
  openHour: tinyint("open_hour").notNull().default(10),
  closeHour: tinyint("close_hour").notNull().default(19),
  commissionBps: int("commission_bps").notNull().default(1200),
  isSample: boolean("is_sample").notNull().default(false),
  createdAt: now("created_at"),
}, (t) => [uniqueIndex("biz_slug_uq").on(t.slug), index("biz_city_cat_idx").on(t.city, t.category)]);

export const businessMembers = mysqlTable("business_members", {
  businessId: ref("business_id").notNull(),
  userId: ref("user_id").notNull(),
  role: mysqlEnum("role", ["owner", "staff"]).notNull().default("owner"),
  createdAt: now("created_at"),
}, (t) => [primaryKey({ columns: [t.businessId, t.userId] }), index("bm_user_idx").on(t.userId)]);

export const services = mysqlTable("services", {
  id: id(),
  businessId: ref("business_id").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  durationMin: int("duration_min").notNull().default(60),
  pricePaise: int("price_paise").notNull(),
  unit: varchar("unit", { length: 30 }),
  active: boolean("active").notNull().default(true),
}, (t) => [index("svc_biz_idx").on(t.businessId)]);

export const experiences = mysqlTable("experiences", {
  id: id(),
  slug: varchar("slug", { length: 160 }).notNull(),
  authorId: ref("author_id").notNull(),
  businessId: ref("business_id").notNull(),
  serviceId: ref("service_id"),
  title: varchar("title", { length: 160 }).notNull(),
  story: text("story").notNull(),
  pros: text("pros"),
  cons: text("cons"),
  suits: varchar("suits", { length: 200 }),
  parking: varchar("parking", { length: 160 }),
  access: varchar("access", { length: 160 }),
  pricePaid: varchar("price_paid", { length: 80 }),
  whoFor: varchar("who_for", { length: 30 }),
  ratingX10: tinyint("rating_x10").notNull(),
  visitedOn: date("visited_on", { mode: "string" }).notNull(),
  status: mysqlEnum("status", ["pending", "published", "rejected"]).notNull().default("pending"),
  proofType: mysqlEnum("proof_type", ["firsthand_booking", "business_confirm", "receipt"]).notNull(),
  level: tinyint("level").notNull().default(0),
  freeOrDiscounted: boolean("free_or_discounted").notNull().default(false),
  evidencePath: varchar("evidence_path", { length: 255 }),
  rejectReason: varchar("reject_reason", { length: 200 }),
  businessReply: text("business_reply"),
  businessReplyAt: datetime("business_reply_at", { mode: "date" }),
  publishedAt: datetime("published_at", { mode: "date" }),
  createdAt: now("created_at"),
}, (t) => [
  uniqueIndex("exp_slug_uq").on(t.slug),
  index("exp_status_pub_idx").on(t.status, t.publishedAt),
  index("exp_author_idx").on(t.authorId),
  index("exp_biz_idx").on(t.businessId),
]);

export const helpfulVotes = mysqlTable("helpful_votes", {
  experienceId: ref("experience_id").notNull(),
  userId: ref("user_id").notNull(),
  createdAt: now("created_at"),
}, (t) => [primaryKey({ columns: [t.experienceId, t.userId] })]);

export const saves = mysqlTable("saves", {
  experienceId: ref("experience_id").notNull(),
  userId: ref("user_id").notNull(),
  createdAt: now("created_at"),
}, (t) => [primaryKey({ columns: [t.experienceId, t.userId] }), index("saves_user_idx").on(t.userId)]);

export const follows = mysqlTable("follows", {
  followerId: ref("follower_id").notNull(),
  followeeId: ref("followee_id").notNull(),
  createdAt: now("created_at"),
}, (t) => [primaryKey({ columns: [t.followerId, t.followeeId] })]);

export const questions = mysqlTable("questions", {
  id: id(),
  experienceId: ref("experience_id").notNull(),
  askerId: ref("asker_id").notNull(),
  body: varchar("body", { length: 600 }).notNull(),
  createdAt: now("created_at"),
}, (t) => [index("q_exp_idx").on(t.experienceId)]);

export const answers = mysqlTable("answers", {
  id: id(),
  questionId: ref("question_id").notNull(),
  authorId: ref("author_id").notNull(),
  body: varchar("body", { length: 1000 }).notNull(),
  createdAt: now("created_at"),
}, (t) => [index("a_q_idx").on(t.questionId)]);

export const reports = mysqlTable("reports", {
  id: id(),
  experienceId: ref("experience_id").notNull(),
  reporterId: ref("reporter_id").notNull(),
  reason: varchar("reason", { length: 400 }).notNull(),
  status: mysqlEnum("status", ["open", "dismissed", "upheld"]).notNull().default("open"),
  createdAt: now("created_at"),
});

export const bookings = mysqlTable("bookings", {
  id: id(),
  code: varchar("code", { length: 6 }).notNull(),
  userId: ref("user_id").notNull(),
  businessId: ref("business_id").notNull(),
  serviceId: ref("service_id").notNull(),
  experienceId: ref("experience_id"),
  recommenderId: ref("recommender_id"),
  slotAt: datetime("slot_at", { mode: "date" }).notNull(),
  pricePaise: int("price_paise").notNull(),
  status: mysqlEnum("status", ["confirmed", "completed", "cancelled"]).notNull().default("confirmed"),
  accuracy: tinyint("accuracy"),
  accuracyAt: datetime("accuracy_at", { mode: "date" }),
  completedAt: datetime("completed_at", { mode: "date" }),
  cancelledAt: datetime("cancelled_at", { mode: "date" }),
  createdAt: now("created_at"),
}, (t) => [
  index("bk_user_idx").on(t.userId),
  index("bk_biz_slot_idx").on(t.businessId, t.slotAt),
  index("bk_rec_idx").on(t.recommenderId),
  uniqueIndex("bk_biz_code_uq").on(t.businessId, t.code),
]);

/** One commission per attributed booking. Amounts in paise (integer). Status moves forward only; every move is logged in ledger_entries. */
export const commissions = mysqlTable("commissions", {
  id: id(),
  bookingId: ref("booking_id").notNull(),
  recommenderId: ref("recommender_id").notNull(),
  platformPaise: int("platform_paise").notNull(),
  amountPaise: int("amount_paise").notNull(),
  status: mysqlEnum("status", ["estimated", "pending_settlement", "payable", "paid", "reversed"]).notNull().default("estimated"),
  payoutId: ref("payout_id"),
  settleAfter: datetime("settle_after", { mode: "date" }),
  createdAt: now("created_at"),
  updatedAt: now("updated_at"),
}, (t) => [uniqueIndex("com_booking_uq").on(t.bookingId), index("com_rec_status_idx").on(t.recommenderId, t.status)]);

export const ledgerEntries = mysqlTable("ledger_entries", {
  id: id(),
  commissionId: ref("commission_id"),
  payoutId: ref("payout_id"),
  userId: ref("user_id").notNull(),
  fromStatus: varchar("from_status", { length: 30 }),
  toStatus: varchar("to_status", { length: 30 }).notNull(),
  amountPaise: int("amount_paise").notNull(),
  note: varchar("note", { length: 200 }),
  createdAt: now("created_at"),
}, (t) => [index("le_user_idx").on(t.userId)]);

export const payouts = mysqlTable("payouts", {
  id: id(),
  userId: ref("user_id").notNull(),
  amountPaise: int("amount_paise").notNull(),
  status: mysqlEnum("status", ["requested", "paid", "rejected"]).notNull().default("requested"),
  reference: varchar("reference", { length: 40 }),
  createdAt: now("created_at"),
  paidAt: datetime("paid_at", { mode: "date" }),
});

export const threads = mysqlTable("threads", {
  id: id(),
  userA: ref("user_a").notNull(),
  userB: ref("user_b").notNull(),
  experienceId: ref("experience_id"),
  lastAt: now("last_at"),
}, (t) => [uniqueIndex("thread_pair_uq").on(t.userA, t.userB)]);

export const messages = mysqlTable("messages", {
  id: id(),
  threadId: ref("thread_id").notNull(),
  senderId: ref("sender_id").notNull(),
  body: varchar("body", { length: 2000 }).notNull(),
  masked: boolean("masked").notNull().default(false),
  createdAt: now("created_at"),
  readAt: datetime("read_at", { mode: "date" }),
}, (t) => [index("msg_thread_idx").on(t.threadId)]);

export const leads = mysqlTable("leads", {
  id: id(),
  businessName: varchar("business_name", { length: 120 }).notNull(),
  category: varchar("category", { length: 60 }).notNull(),
  city: varchar("city", { length: 60 }).notNull(),
  contactName: varchar("contact_name", { length: 80 }).notNull(),
  phone: varchar("phone", { length: 30 }).notNull(),
  status: mysqlEnum("status", ["new", "contacted", "closed"]).notNull().default("new"),
  createdAt: now("created_at"),
});

/** Append-only audit trail for every trust, money and admin decision. */
export const auditEvents = mysqlTable("audit_events", {
  id: id(),
  actorId: ref("actor_id"),
  entityType: varchar("entity_type", { length: 30 }).notNull(),
  entityId: ref("entity_id"),
  action: varchar("action", { length: 60 }).notNull(),
  reason: varchar("reason", { length: 200 }),
  createdAt: now("created_at"),
}, (t) => [index("audit_created_idx").on(t.createdAt)]);
