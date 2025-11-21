import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

const transporter =
  env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      })
    : null;

export async function sendOtpEmail(email: string, code: string, purpose: string) {
  if (!transporter || !env.EMAIL_FROM) {
    logger.info(`OTP for ${email} (${purpose}): ${code}`);
    return;
  }

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: email,
    subject: `Your LinkUp ${purpose} code`,
    text: `Your verification code is ${code}. It expires in ${env.OTP_EXP_MINUTES} minutes.`,
  });
}
