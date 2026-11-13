const env = process.env;
const bool = (v: string | undefined, d: boolean) => (v === undefined || v === "" ? d : ["1", "true", "yes"].includes(v.toLowerCase()));
const num = (v: string | undefined, d: number) => (v && !Number.isNaN(Number(v)) ? Number(v) : d);

export const config = {
  port: num(env.PORT, 4000),
  databaseUrl: env.DATABASE_URL ?? "mysql://firsthand:firsthand@127.0.0.1:3306/firsthand",
  smtpUrl: env.SMTP_URL || "",
  mailFrom: env.MAIL_FROM || "Firsthand <no-reply@firsthand.decyb.com>",
  /** When no SMTP is configured, sign-in codes are shown on screen. Never applies to admin access. */
  get otpPreview() { return !this.smtpUrl && bool(env.OTP_PREVIEW, true); },
  adminAccessKey: env.ADMIN_ACCESS_KEY || "",
  cookieSecure: bool(env.COOKIE_SECURE, false),
  uploadDir: env.UPLOAD_DIR || "./uploads",
  seedDemo: bool(env.SEED_DEMO, true),
  /** Recommender share of platform commission, in basis points (3500 = 35%). */
  recommenderShareBps: num(env.RECOMMENDER_SHARE_BPS, 3500),
  /** Days after a confirmed visit before commission becomes payable (refund window). */
  settleDays: num(env.SETTLE_DAYS, 7),
  minPayoutPaise: num(env.MIN_PAYOUT_PAISE, 50000),
  /** How early before the slot a business may confirm a visit. */
  confirmWindowHours: num(env.CONFIRM_WINDOW_HOURS, 12),
  timezone: "Asia/Kolkata",
};
