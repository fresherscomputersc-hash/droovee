import { Types } from "mongoose";
import { BookingModel, CustomerModel, DriverModel, NotificationModel } from "../models";
import { sendMail } from "./mail";

export type BookingEvent =
  | "received"
  | "confirmed"
  | "driver_assigned"
  | "driver_on_the_way"
  | "in_progress"
  | "completed"
  | "cancelled";

const EVENT_TEXT: Record<BookingEvent, (b: { bookingNumber: string }, extra?: string) => { subject: string; text: string }> = {
  received: (b) => ({
    subject: `Droovee booking ${b.bookingNumber} received`,
    text: `Your booking ${b.bookingNumber} has been received. Our team will confirm your driver shortly. Track it with your booking ID — no sign-in needed. — Team Droovee`,
  }),
  confirmed: (b) => ({
    subject: `Droovee booking ${b.bookingNumber} confirmed`,
    text: `Good news — booking ${b.bookingNumber} is confirmed. We're assigning your driver now. — Team Droovee`,
  }),
  driver_assigned: (b, extra) => ({
    subject: `Your Droovee driver for ${b.bookingNumber}`,
    text: `Your driver for booking ${b.bookingNumber}: ${extra ?? "details coming shortly"}. Share your trip START code with the driver to begin, and the END code to finish. Codes are in this email and with our team. — Team Droovee`,
  }),
  driver_on_the_way: (b) => ({
    subject: `Driver on the way (${b.bookingNumber})`,
    text: `Your driver is on the way to your pickup for booking ${b.bookingNumber}. — Team Droovee`,
  }),
  in_progress: (b) => ({
    subject: `Trip started (${b.bookingNumber})`,
    text: `Your trip ${b.bookingNumber} has started. Sit back — the fare is settled at the end. — Team Droovee`,
  }),
  completed: (b) => ({
    subject: `Trip completed (${b.bookingNumber})`,
    text: `Trip ${b.bookingNumber} is complete. Thank you for riding with Droovee. — Team Droovee`,
  }),
  cancelled: (b, extra) => ({
    subject: `Booking ${b.bookingNumber} cancelled`,
    text: `Booking ${b.bookingNumber} has been cancelled.${extra ? ` ${extra}` : ""} — Team Droovee`,
  }),
};

/**
 * Automatic customer message for a booking event. Sends email when we have an
 * address (SMTP configured); WhatsApp/SMS senders plug in here once a
 * provider is configured. Always writes a Notification row; never throws.
 */
export async function notifyBookingEvent(
  bookingId: Types.ObjectId | string,
  event: BookingEvent,
  opts: { driverText?: string; cancelNote?: string; tripCodes?: { start: string; end: string } } = {},
): Promise<void> {
  try {
    const b = await BookingModel.findById(bookingId).lean();
    if (!b) return;
    const customer = await CustomerModel.findById(b.customerId).select("email").lean();
    const to = (b as { guestEmail?: string }).guestEmail ?? customer?.email ?? null;
    const msg = EVENT_TEXT[event]({ bookingNumber: b.bookingNumber }, opts.driverText ?? opts.cancelNote);
    if (event === "driver_assigned" && opts.tripCodes) {
      msg.text += `\nTrip START code: ${opts.tripCodes.start} — share it with your driver to begin the trip.\nTrip END code: ${opts.tripCodes.end} — share it to finish the trip.`;
    }
    if (!to) {
      await NotificationModel.create({ bookingId: b._id, event, channel: "email", to: "(no email)", sent: false, error: "no address" });
      return;
    }
    const sent = await sendMail(to, msg.subject, msg.text);
    await NotificationModel.create({
      bookingId: b._id,
      event,
      channel: "email",
      to,
      sent,
      error: sent ? undefined : "smtp not configured or send failed",
    });
  } catch {
    // Notifications never break bookings.
  }
}

/** Driver display text for the driver_assigned message. */
export async function driverTextFor(driverId: unknown): Promise<string | undefined> {
  if (!driverId) return undefined;
  const d = await DriverModel.findById(driverId as string).select("name phone").lean();
  return d ? `${d.name} (${d.phone})` : undefined;
}

/** Records that a customer message was (or wasn't) sent — e.g. the detailed confirmation mail. */
export async function logNotification(
  bookingId: Types.ObjectId | string,
  event: BookingEvent | "reminder",
  channel: "email" | "whatsapp" | "sms",
  to: string,
  sent: boolean,
  error?: string,
): Promise<void> {
  try {
    await NotificationModel.create({ bookingId, event, channel, to, sent, error });
  } catch {
    // Notifications never break bookings.
  }
}
