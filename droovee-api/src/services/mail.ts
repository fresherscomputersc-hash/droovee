import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { config } from "../config";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!config.smtpConfigured) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: { user: config.smtpUser, pass: config.smtpPass },
    });
  }
  return transporter;
}

/**
 * Sends an email. Never throws: when SMTP is not configured the message is
 * logged and skipped, so bookings and resets keep working in dev. Returns
 * true when the mail was handed to the SMTP server.
 */
export async function sendMail(to: string, subject: string, text: string): Promise<boolean> {
  const t = getTransporter();
  if (!t) {
    console.log(JSON.stringify({ level: "info", msg: "Email skipped (SMTP not configured)", to, subject }));
    return false;
  }
  try {
    await t.sendMail({ from: config.smtpFrom, to, subject, text });
    return true;
  } catch (e) {
    console.error(JSON.stringify({ level: "error", msg: "Email send failed", to, error: (e as Error).message }));
    return false;
  }
}

/** Booking confirmation (PDF update: confirmations go to email via SMTP for now). */
export function bookingConfirmationMail(opts: {
  bookingNumber: string;
  name: string;
  serviceType: string;
  start: Date;
  pickup: string;
  total: number;
}): { subject: string; text: string } {
  const subject = `Droovee booking ${opts.bookingNumber} received`;
  const text = [
    `Hi ${opts.name},`,
    ``,
    `Your Droovee booking ${opts.bookingNumber} has been received.`,
    `Our team will confirm your driver shortly.`,
    ``,
    `Service: ${opts.serviceType}`,
    `Start: ${opts.start.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} (IST)`,
    `Pickup: ${opts.pickup}`,
    `Estimate: ₹${opts.total} (final fare confirmed by our team)`,
    ``,
    `Keep this booking ID for future reference — you can track your booking with it (no sign-in needed).`,
    `Tolls, parking, fuel and the driver's food, stay and return travel are paid by the customer.`,
    ``,
    `— Team Droovee, Bhubaneswar (Open 24×7)`,
  ].join("\n");
  return { subject, text };
}
