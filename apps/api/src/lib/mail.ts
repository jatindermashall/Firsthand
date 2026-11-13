import nodemailer, { type Transporter } from "nodemailer";
import { config } from "./config.js";

let transport: Transporter | null = null;
export async function sendCode(email: string, code: string) {
  if (!config.smtpUrl) return false;
  transport ??= nodemailer.createTransport(config.smtpUrl);
  await transport.sendMail({
    from: config.mailFrom, to: email, subject: `Your Firsthand code: ${code}`,
    text: `Your Firsthand sign-in code is ${code}. It expires in 10 minutes. If you didn't ask for it, ignore this email.`,
  });
  return true;
}
