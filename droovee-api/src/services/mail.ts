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
 * Sends an email with optional rich HTML body. Never throws: when SMTP is not configured
 * the message is logged and skipped, so bookings, registrations and resets keep working in dev.
 * Returns true when the mail was handed to the SMTP server.
 */
export async function sendMail(to: string, subject: string, text: string, html?: string): Promise<boolean> {
  const t = getTransporter();
  if (!t) {
    console.log(JSON.stringify({ level: "info", msg: "Email skipped (SMTP not configured)", to, subject }));
    return false;
  }
  try {
    await t.sendMail({ from: config.smtpFrom, to, subject, text, html });
    return true;
  } catch (e) {
    console.error(JSON.stringify({ level: "error", msg: "Email send failed", to, error: (e as Error).message }));
    return false;
  }
}

/** Base wrapper for Droovee branded responsive HTML emails */
function emailLayout(title: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); border: 1px solid #E2E8F0;">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #0F172A; padding: 24px 32px; text-align: left;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #FFFFFF;">
                      DROO<span style="color: #10B981;">VEE</span>
                    </span>
                    <p style="margin: 4px 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94A3B8; font-weight: 600;">
                      Professional Drivers for Your Own Car
                    </p>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background-color: #064E3B; color: #34D399; font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">
                      24×7 Dispatch
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Accent Line -->
          <tr>
            <td style="height: 3px; background-color: #059669;"></td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 32px 24px;">
              ${bodyContent}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 24px 32px; border-top: 1px solid #E2E8F0; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #64748B; font-weight: 600;">
                Droovee Technologies Private Limited
              </p>
              <p style="margin: 4px 0 0; font-size: 11px; color: #94A3B8;">
                Doorstep Driver Dispatch Hub · Bhubaneswar, Odisha
              </p>
              <p style="margin: 12px 0 0; font-size: 11px; color: #64748B;">
                Need assistance? Call our 24×7 Helpline: <strong style="color: #0F172A;">+91 94390 00000</strong> or email <a href="mailto:support@droovee.in" style="color: #059669; text-decoration: none;">support@droovee.in</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** 1. User Registration Welcome Email (CLIENT REQ §5) */
export function welcomeEmail(opts: { name: string; email: string }): { subject: string; text: string; html: string } {
  const subject = `Welcome to Droovee, ${opts.name}! Your car, our professional driver`;
  const text = [
    `Hi ${opts.name},`,
    ``,
    `Welcome to Droovee! Your account has been successfully created.`,
    `Now you can book background-verified, trained drivers for your own car in Bhubaneswar with a single tap.`,
    ``,
    `Launch Offer: Use promo code LAUNCH99 on your first booking to get your first hour for just ₹99!`,
    ``,
    `Why Car Owners Choose Droovee:`,
    `- 100% Police & Address-Verified Drivers`,
    `- Doorstep Dispatch in 30–45 Minutes`,
    `- Flat & Transparent Hourly / Package Pricing`,
    `- Car Safety Guarantee While Driving`,
    ``,
    `Log in anytime at https://droovee.in/login or call our 24x7 helpline: +91 94390 00000`,
    ``,
    `— Team Droovee, Bhubaneswar`,
  ].join("\n");

  const html = emailLayout(
    "Welcome to Droovee",
    `<h1 style="margin: 0 0 8px; font-size: 20px; font-weight: 700; color: #0F172A;">
      Welcome to Droovee, ${opts.name}!
    </h1>
    <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #475569;">
      Your account is ready. Whenever you need to avoid traffic fatigue, attend parties, plan outstation temple visits, or head to the airport, our trained drivers are ready to pilot <strong>your own car</strong>.
    </p>

    <!-- Promo Card -->
    <div style="background-color: #ECFDF5; border: 1px dashed #10B981; border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: center;">
      <p style="margin: 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #065F46;">
        New Member Welcome Gift
      </p>
      <p style="margin: 4px 0; font-size: 18px; font-weight: 800; color: #047857;">
        Use Code: <span style="background-color: #FFFFFF; padding: 2px 10px; border-radius: 6px; border: 1px solid #A7F3D0;">LAUNCH99</span>
      </p>
      <p style="margin: 0; font-size: 12px; color: #065F46;">
        Get your first hour of driver service for just <strong>₹99</strong>!
      </p>
    </div>

    <!-- Feature list -->
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
      <tr>
        <td style="padding: 8px 0; font-size: 13px; color: #334155;">
          <strong style="color: #059669;">✓ Verified Drivers:</strong> Police verified with commercial driving experience.
        </td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-size: 13px; color: #334155;">
          <strong style="color: #059669;">✓ All Cars Welcome:</strong> Automatic, Manual, SUVs, Sedans, and Luxury EVs.
        </td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-size: 13px; color: #334155;">
          <strong style="color: #059669;">✓ Transparent Billing:</strong> Clear hourly rates with no hidden platform fees.
        </td>
      </tr>
    </table>

    <!-- CTA Button -->
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0 16px;">
      <tr>
        <td align="center">
          <a href="https://droovee.in/book" style="display: inline-block; background-color: #059669; color: #FFFFFF; font-size: 14px; font-weight: 700; padding: 14px 28px; border-radius: 10px; text-decoration: none; box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);">
            Book Your First Driver Now →
          </a>
        </td>
      </tr>
    </table>`
  );

  return { subject, text, html };
}

/** 2. Booking Confirmation Email Template (CLIENT REQ §5) */
export function bookingConfirmationMail(opts: {
  bookingNumber: string;
  name: string;
  serviceType: string;
  start: Date;
  pickup: string;
  destination?: string;
  carModel?: string;
  total: number;
  trackingUrl?: string;
}): { subject: string; text: string; html: string } {
  const istDateStr = opts.start.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
  const subject = `Booking Confirmed: #${opts.bookingNumber} (${opts.serviceType})`;
  const trackUrl = opts.trackingUrl ?? `https://droovee.in/track?b=${encodeURIComponent(opts.bookingNumber)}`;

  const text = [
    `Hi ${opts.name},`,
    ``,
    `Your Droovee booking #${opts.bookingNumber} has been received and confirmed.`,
    ``,
    `Booking Details:`,
    `- Booking ID: ${opts.bookingNumber}`,
    `- Service: ${opts.serviceType}`,
    `- Scheduled Pickup: ${istDateStr} (IST)`,
    `- Pickup Address: ${opts.pickup}`,
    opts.destination ? `- Destination: ${opts.destination}` : null,
    opts.carModel ? `- Vehicle: ${opts.carModel}` : null,
    `- Estimated Fare: ₹${opts.total}`,
    ``,
    `Track your active booking: ${trackUrl}`,
    ``,
    `Important Notes:`,
    `- Keep your Booking ID handy for quick driver tracking.`,
    `- Tolls, parking, and fuel are paid directly by the customer.`,
    `- For outstation overnight stays, driver night halt is ₹399/night.`,
    ``,
    `— Team Droovee, Bhubaneswar (24×7 Helpline: +91 94390 00000)`,
  ].filter(Boolean).join("\n");

  const html = emailLayout(
    `Booking Confirmed #${opts.bookingNumber}`,
    `<div style="text-align: center; margin-bottom: 24px;">
      <span style="display: inline-block; background-color: #ECFDF5; color: #047857; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 9999px; text-transform: uppercase;">
        ✓ Booking Confirmed
      </span>
      <h1 style="margin: 12px 0 4px; font-size: 22px; font-weight: 800; color: #0F172A;">
        Booking #${opts.bookingNumber}
      </h1>
      <p style="margin: 0; font-size: 13px; color: #64748B;">
        Hi ${opts.name}, your driver reservation is confirmed.
      </p>
    </div>

    <!-- Booking Details Table -->
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; margin-bottom: 24px; padding: 16px;">
      <tr>
        <td style="padding: 8px 12px; font-size: 12px; color: #64748B; width: 35%;">Service Type:</td>
        <td style="padding: 8px 12px; font-size: 13px; font-weight: 600; color: #0F172A;">${opts.serviceType}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; font-size: 12px; color: #64748B;">Pickup Date & Time:</td>
        <td style="padding: 8px 12px; font-size: 13px; font-weight: 700; color: #059669;">${istDateStr}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; font-size: 12px; color: #64748B;">Pickup Location:</td>
        <td style="padding: 8px 12px; font-size: 13px; color: #1E293B;">${opts.pickup}</td>
      </tr>
      ${opts.destination ? `
      <tr>
        <td style="padding: 8px 12px; font-size: 12px; color: #64748B;">Destination:</td>
        <td style="padding: 8px 12px; font-size: 13px; color: #1E293B;">${opts.destination}</td>
      </tr>` : ""}
      ${opts.carModel ? `
      <tr>
        <td style="padding: 8px 12px; font-size: 12px; color: #64748B;">Car Model:</td>
        <td style="padding: 8px 12px; font-size: 13px; color: #1E293B;">${opts.carModel}</td>
      </tr>` : ""}
      <tr style="border-top: 1px solid #E2E8F0;">
        <td style="padding: 12px 12px 4px; font-size: 12px; font-weight: 700; color: #0F172A;">Estimated Total:</td>
        <td style="padding: 12px 12px 4px; font-size: 18px; font-weight: 800; color: #0F172A;">₹${opts.total}</td>
      </tr>
    </table>

    <!-- Action Link -->
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
      <tr>
        <td align="center">
          <a href="${trackUrl}" style="display: inline-block; background-color: #059669; color: #FFFFFF; font-size: 14px; font-weight: 700; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
            Track Your Driver & Trip Details →
          </a>
        </td>
      </tr>
    </table>

    <div style="background-color: #F1F5F9; border-radius: 8px; padding: 12px; font-size: 11px; color: #475569; line-height: 1.5;">
      📌 <strong>Save your Booking ID (${opts.bookingNumber})</strong>: Use it to track the driver or reach our dispatch desk 24×7. Tolls, parking, and vehicle fuel are customer's responsibility.
    </div>`
  );

  return { subject, text, html };
}

/** 3. Ride Completion & Receipt Email Template (CLIENT REQ §5) */
export function tripCompletedMail(opts: {
  bookingNumber: string;
  name: string;
  serviceType: string;
  finalFare: number;
  pickup: string;
  destination?: string;
  receiptUrl?: string;
}): { subject: string; text: string; html: string } {
  const subject = `Trip Completed & Receipt: #${opts.bookingNumber} (₹${opts.finalFare})`;
  const receiptLink = opts.receiptUrl ?? `https://droovee.in/admin/bookings/${opts.bookingNumber}/receipt`;

  const text = [
    `Hi ${opts.name},`,
    ``,
    `Your trip #${opts.bookingNumber} with Droovee is completed!`,
    ``,
    `Trip Summary:`,
    `- Booking Number: ${opts.bookingNumber}`,
    `- Service: ${opts.serviceType}`,
    `- Final Amount Paid: ₹${opts.finalFare}`,
    `- Pickup: ${opts.pickup}`,
    opts.destination ? `- Destination: ${opts.destination}` : null,
    ``,
    `Download your receipt / GST tax invoice: ${receiptLink}`,
    ``,
    `Thank you for choosing Droovee. We look forward to driving your car again soon!`,
    ``,
    `— Team Droovee, Bhubaneswar`,
  ].filter(Boolean).join("\n");

  const html = emailLayout(
    `Trip Completed & Receipt #${opts.bookingNumber}`,
    `<div style="text-align: center; margin-bottom: 24px;">
      <span style="display: inline-block; background-color: #ECFDF5; color: #047857; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 9999px; text-transform: uppercase;">
        ✓ Ride Successfully Completed
      </span>
      <h1 style="margin: 12px 0 4px; font-size: 22px; font-weight: 800; color: #0F172A;">
        Thank You for Riding with Droovee
      </h1>
      <p style="margin: 0; font-size: 13px; color: #64748B;">
        Here is your official trip receipt for booking #${opts.bookingNumber}.
      </p>
    </div>

    <!-- Receipt Amount Banner -->
    <div style="background-color: #0F172A; color: #FFFFFF; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #94A3B8;">
        Final Fare Amount
      </p>
      <p style="margin: 6px 0 0; font-size: 32px; font-weight: 800; color: #10B981;">
        ₹${opts.finalFare}
      </p>
      <p style="margin: 4px 0 0; font-size: 11px; color: #CBD5E1;">
        Paid in full · GST Invoice Available
      </p>
    </div>

    <!-- Details -->
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; margin-bottom: 24px; padding: 16px;">
      <tr>
        <td style="padding: 6px 12px; font-size: 12px; color: #64748B;">Booking ID:</td>
        <td style="padding: 6px 12px; font-size: 13px; font-weight: 700; color: #0F172A;">${opts.bookingNumber}</td>
      </tr>
      <tr>
        <td style="padding: 6px 12px; font-size: 12px; color: #64748B;">Service Type:</td>
        <td style="padding: 6px 12px; font-size: 13px; color: #1E293B;">${opts.serviceType}</td>
      </tr>
      <tr>
        <td style="padding: 6px 12px; font-size: 12px; color: #64748B;">Pickup Location:</td>
        <td style="padding: 6px 12px; font-size: 13px; color: #1E293B;">${opts.pickup}</td>
      </tr>
      ${opts.destination ? `
      <tr>
        <td style="padding: 6px 12px; font-size: 12px; color: #64748B;">Drop Location:</td>
        <td style="padding: 6px 12px; font-size: 13px; color: #1E293B;">${opts.destination}</td>
      </tr>` : ""}
    </table>

    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
      <tr>
        <td align="center">
          <a href="https://droovee.in/book" style="display: inline-block; background-color: #059669; color: #FFFFFF; font-size: 13px; font-weight: 700; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
            Book Another Driver →
          </a>
        </td>
      </tr>
    </table>`
  );

  return { subject, text, html };
}
