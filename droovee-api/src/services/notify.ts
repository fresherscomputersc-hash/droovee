import { Types } from "mongoose";
import { BookingModel, CustomerModel, DriverModel, NotificationModel } from "../models";
import { sendMail, bookingConfirmationMail, tripCompletedMail } from "./mail";

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
    subject: `Droovee booking #${b.bookingNumber} received`,
    text: `Your booking #${b.bookingNumber} has been received. Our dispatch team will confirm your driver shortly. Track it anytime at https://droovee.in/track with your booking ID (no sign-in needed). — Team Droovee`,
  }),
  confirmed: (b) => ({
    subject: `Droovee booking #${b.bookingNumber} confirmed`,
    text: `Good news — booking #${b.bookingNumber} is confirmed. We are assigning your driver now. — Team Droovee`,
  }),
  driver_assigned: (b, extra) => ({
    subject: `Your Droovee driver for #${b.bookingNumber}`,
    text: `Your driver for booking #${b.bookingNumber}: ${extra ?? "details coming shortly"}. Check your live tracking link or account dashboard for trip authorization codes. — Team Droovee`,
  }),
  driver_on_the_way: (b) => ({
    subject: `Driver on the way (#${b.bookingNumber})`,
    text: `Your driver is on the way to your pickup location for booking #${b.bookingNumber}. — Team Droovee`,
  }),
  in_progress: (b) => ({
    subject: `Trip started (#${b.bookingNumber})`,
    text: `Your trip #${b.bookingNumber} has started. Sit back and enjoy the ride. Fare will be settled upon completion. — Team Droovee`,
  }),
  completed: (b) => ({
    subject: `Trip completed (#${b.bookingNumber})`,
    text: `Trip #${b.bookingNumber} is complete. Thank you for riding with Droovee! Your invoice is available in your account. — Team Droovee`,
  }),
  cancelled: (b, extra) => ({
    subject: `Booking #${b.bookingNumber} cancelled`,
    text: `Booking #${b.bookingNumber} has been cancelled.${extra ? ` ${extra}` : ""} — Team Droovee`,
  }),
};

/**
 * Automatic customer message for a booking event. Sends responsive HTML email when we have an
 * address (SMTP configured); always logs in NotificationModel; never throws.
 */
export async function notifyBookingEvent(
  bookingId: Types.ObjectId | string,
  event: BookingEvent,
  opts: { driverText?: string; cancelNote?: string; tripCodes?: { start: string; end: string } } = {},
): Promise<void> {
  try {
    const b = await BookingModel.findById(bookingId).lean();
    if (!b) return;
    const customer = await CustomerModel.findById(b.customerId).select("name email").lean();
    const to = customer?.email ?? null;
    const customerName = customer?.name ?? "Customer";

    const msg = EVENT_TEXT[event]({ bookingNumber: b.bookingNumber }, opts.driverText ?? opts.cancelNote);
    let subject = msg.subject;
    let text = msg.text;
    let htmlContent: string | undefined;

    if (event === "received" || event === "confirmed") {
      const t = bookingConfirmationMail({
        bookingNumber: b.bookingNumber,
        name: customerName,
        serviceType: b.serviceType,
        start: b.scheduledStart,
        pickup: b.pickup?.address ?? "",
        destination: b.destination?.address ?? undefined,
        carModel: b.carModel ?? undefined,
        total: b.fareEstimate?.total ?? 0,
      });
      subject = t.subject;
      text = t.text;
      htmlContent = t.html;
    } else if (event === "completed") {
      const t = tripCompletedMail({
        bookingNumber: b.bookingNumber,
        name: customerName,
        serviceType: b.serviceType,
        finalFare: b.finalFare ?? b.fareEstimate?.total ?? 0,
        pickup: b.pickup?.address ?? "",
        destination: b.destination?.address ?? undefined,
      });
      subject = t.subject;
      text = t.text;
      htmlContent = t.html;
    }

    if (!to) {
      await NotificationModel.create({ bookingId: b._id, event, channel: "email", to: "(no email)", sent: false, error: "no address" });
      return;
    }
    const sent = await sendMail(to, subject, text, htmlContent);
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
