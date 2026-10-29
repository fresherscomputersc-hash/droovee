"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { api } from "@/lib/api";
import { CONTACT_PHONE_DISPLAY, CONTACT_TEL, waWithText } from "@/lib/contact";

/** Driver profile card shown to the customer once a driver is assigned. */
export function DriverCard({ driver }: { driver: { name?: string; phone?: string; photoUrl?: string; experienceYears?: number; languages?: string[] } | null | undefined }) {
  if (!driver) return null;
  return (
    <Card>
      <h2 className="font-semibold">Your driver</h2>
      <div className="mt-3 flex items-center gap-4">
        {driver.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={driver.photoUrl} alt={driver.name ?? "Driver"} className="h-16 w-16 rounded-full object-cover ring-1 ring-slate-200" />
        ) : (
          <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-soft text-xl font-semibold text-brand-ink">
            {(driver.name ?? "?").slice(0, 1).toUpperCase()}
          </span>
        )}
        <div>
          <p className="font-semibold">{driver.name}</p>
          <p className="text-sm text-slate-600">
            {[driver.experienceYears != null ? `${driver.experienceYears} yrs experience` : null, (driver.languages ?? []).join(" · ")].filter(Boolean).join(" · ") || "Verified Droovee driver"}
          </p>
          <p className="text-sm text-slate-600">{driver.phone}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <a href={`tel:${driver.phone}`} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-brand-ink hover:bg-accent-hover">Call driver</a>
        <a href={`https://wa.me/${String(driver.phone ?? "").replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="rounded-lg bg-white px-4 py-2 text-sm font-medium ring-1 ring-slate-300 hover:bg-slate-50">WhatsApp driver</a>
      </div>
    </Card>
  );
}

/** Emergency procedure: accident, breakdown, driver unreachable — one plan, one number. */
export function EmergencyCard({ bookingNumber }: { bookingNumber?: string }) {
  const wa = waWithText(bookingNumber ? `Emergency with booking ${bookingNumber}: ` : "Emergency: ");
  return (
    <Card>
      <h2 className="font-semibold text-rose-700">Emergency? Do this</h2>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700">
        <li>Stay safe. Move away from traffic if you can.</li>
        <li>Call us now: <a href={CONTACT_TEL} className="font-semibold text-brand-link underline">{CONTACT_PHONE_DISPLAY}</a> (24×7).</li>
        <li>Accident: call police (100) and ambulance (108) first, then us.</li>
        <li>Breakdown or driver unreachable: call us — we send a replacement.</li>
      </ol>
      <div className="mt-4 flex flex-wrap gap-3">
        <a href={CONTACT_TEL} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700">Call now</a>
        <a href={wa} target="_blank" rel="noreferrer" className="rounded-lg bg-white px-4 py-2 text-sm font-medium ring-1 ring-slate-300 hover:bg-slate-50">WhatsApp us</a>
      </div>
    </Card>
  );
}

/** WhatsApp help link with booking reference (support target: reply within 2 hours, 8am–10pm). */
export function HelpOnWhatsApp({ bookingNumber }: { bookingNumber?: string }) {
  const href = waWithText(bookingNumber ? `Hi Droovee, I need help with booking ${bookingNumber}. ` : "Hi Droovee, I need help. ");
  return (
    <p className="mt-2 text-xs text-slate-500">
      Need help? <a href={href} target="_blank" rel="noreferrer" className="font-medium text-brand-link underline">Message us on WhatsApp</a> — we reply within 2 hours (8am–10pm).
    </p>
  );
}

/** Recent customer reviews from completed trips. */
export function Reviews() {
  const [items, setItems] = useState<any[] | null>(null);
  useEffect(() => {
    api<{ items: any[] }>("/ratings/recent", { auth: false }).then((r) => setItems(r.items)).catch(() => setItems([]));
  }, []);
  if (!items?.length) return null;
  return (
    <div className="mt-8 grid gap-6 md:grid-cols-3">
      {items.slice(0, 3).map((r, i) => (
        <div key={i} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm">{"⭐".repeat(r.stars)}</p>
          <p className="mt-2 text-sm text-slate-700">“{r.review}”</p>
        </div>
      ))}
    </div>
  );
}
