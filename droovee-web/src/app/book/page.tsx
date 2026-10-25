"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PublicShell } from "@/components/PublicShell";
import { Alert, Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { getSession } from "@/lib/session";
import { money, SERVICE_LABEL, istInputToIso } from "@/lib/format";
import { HourSelector } from "@/components/HourSelector";
import { CONTACT_PHONE_DISPLAY, CONTACT_TEL } from "@/lib/contact";

type Service = keyof typeof SERVICE_LABEL;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Estimate {
  total: number;
  lines: { label: string; amount: number }[];
  usesUnconfirmedRules: boolean;
}

function istDefaultStart() {
  const istNow = Date.now() + 330 * 60_000;
  const rounded = Math.ceil((istNow + 60 * 60_000) / 3_600_000) * 3_600_000;
  return new Date(rounded).toISOString().slice(0, 16);
}

export default function BookPage() {
  return <BookForm />;
}

function BookForm() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [account, setAccount] = useState<{ name?: string; phone?: string } | null>(null);

  const [service, setService] = useState<Service>("hourly");
  const [immediate, setImmediate] = useState(false);
  const [immediateAt, setImmediateAt] = useState<string | null>(null);
  const [start, setStart] = useState(() => istDefaultStart());
  const [hours, setHours] = useState(1);
  const [end, setEnd] = useState("");
  const [nights, setNights] = useState(0);
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [carModel, setCarModel] = useState("");
  const [transmission, setTransmission] = useState<"manual" | "automatic">("manual");
  const [instructions, setInstructions] = useState("");
  const [coupon, setCoupon] = useState("");
  const [referral, setReferral] = useState("");
  const [pkg, setPkg] = useState<any | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [returnPickup, setReturnPickup] = useState("");

  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [estError, setEstError] = useState<string | null>(null);
  const [estLoading, setEstLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const here = `${window.location.pathname}${window.location.search}`;
    const s = getSession();
    if (!s || s.kind !== "customer") {
      router.replace(`/login?next=${encodeURIComponent(here)}`);
      return;
    }
    api<{ name?: string; phone?: string }>("/auth/me")
      .then((me) => {
        setAccount(me);
        setReady(true);
      })
      .catch(() => router.replace(`/login?next=${encodeURIComponent(here)}`));
  }, [router]);

  // Deep links from service and package pages.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const svc = params.get("service");
    if (svc && svc in SERVICE_LABEL) {
      setService(svc as Service);
      if (svc !== "hourly") setCoupon("");
    }
    const pid = params.get("package");
    if (!pid) return;
    api<{ packages: any[] }>("/services", { auth: false })
      .then((r) => {
        const found = r.packages.find((x) => x.id === pid);
        if (!found) return;
        setPkg(found);
        if (found.serviceType in SERVICE_LABEL) setService(found.serviceType);
        setHours(found.durationHours);
        setNights(found.nights ?? 0);
        if (found.destination) setDestination(found.destination);
        setCoupon("");
      })
      .catch(() => {});
  }, []);

  const isFixed = service === "half_day" || service === "full_day";
  const isOutstation = service === "outstation_one_way" || service === "outstation_round_trip";
  const isMonthly = service === "monthly_office";
  const needsDestination = isOutstation || service === "airport_pickup_drop" || isMonthly;

  const effectiveHours = useMemo(() => {
    if (service === "half_day") return 4;
    if (service === "full_day") return 8;
    if (isMonthly) {
      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);
      const h = (eh * 60 + em - (sh * 60 + sm)) / 60;
      return h > 0 ? h : 0;
    }
    if (isOutstation && end && start) {
      const h = (new Date(istInputToIso(end)).getTime() - new Date(istInputToIso(start)).getTime()) / 3_600_000;
      return h > 0 ? h : 0;
    }
    return hours;
  }, [service, hours, isMonthly, startTime, endTime, isOutstation, end, start]);

  const effectiveStart = isMonthly ? (startDate ? `${startDate}T${startTime}` : "") : start;
  const estimateStart = !isMonthly && immediate && immediateAt ? immediateAt : effectiveStart;

  // Live estimate: no separate "see estimate" step.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (pkg) {
        if (!cancelled) {
          setEstimate({
            total: pkg.fixedPrice,
            lines: [{ label: `Package: ${pkg.name}`, amount: pkg.fixedPrice }],
            usesUnconfirmedRules: false,
          });
          setEstError(null);
          setEstLoading(false);
        }
        return;
      }
      if (!estimateStart || !(effectiveHours > 0)) {
        if (!cancelled) {
          setEstimate(null);
          setEstLoading(false);
        }
        return;
      }
      if (!cancelled) {
        setEstLoading(true);
        setEstError(null);
      }
      try {
        const q = new URLSearchParams({
          serviceType: service,
          durationHours: String(effectiveHours),
          startAt: istInputToIso(estimateStart),
          nights: String(isOutstation ? nights : 0),
        });
        if (coupon.trim()) q.set("couponCode", coupon.trim().toUpperCase());
        const e = await api<Estimate>(`/pricing/estimate?${q.toString()}`, { auth: false });
        if (!cancelled) setEstimate(e);
      } catch (err) {
        if (!cancelled) {
          setEstimate(null);
          setEstError(err instanceof ApiError ? err.message : "Could not calculate the estimate.");
        }
      } finally {
        if (!cancelled) setEstLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pkg, estimateStart, effectiveHours, service, nights, coupon, isOutstation]);

  function toggleDay(d: number) {
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFields({});
    const local: Record<string, string> = {};
    if (pickup.trim().length < 5) local.pickup = "Enter a pickup address (at least 5 characters).";
    if (needsDestination && destination.trim().length < 5) local.destination = "Enter the destination or office address.";
    if (carModel.trim().length < 2) local.carModel = "Enter your car model.";
    if (!isMonthly && !immediate && !effectiveStart) local.scheduledStart = "Choose a start date and time.";
    if (isOutstation && !end) local.scheduledEnd = "Enter the trip end date and time.";
    if (isMonthly && days.length === 0) local.days = "Choose at least one working day.";
    if (isMonthly && (!startDate || !endDate)) local.startDate = "Choose the schedule start and end dates.";
    if (!(effectiveHours > 0)) local.durationHours = "Duration must be more than zero.";
    if (!agreed) local.agreedToTerms = "Please accept the Terms and Cancellation policy.";
    setFields(local);
    if (Object.keys(local).length) {
      setError("Please check the highlighted fields.");
      return;
    }

    const startIso = immediate ? new Date().toISOString() : istInputToIso(effectiveStart);
    const body: Record<string, unknown> = {
      serviceType: service,
      immediate,
      pickup: { address: pickup.trim() },
      scheduledStart: startIso,
      durationHours: effectiveHours,
      nights: isOutstation ? nights : 0,
      carModel: carModel.trim(),
      transmission,
      instructions: instructions.trim(),
      agreedToTerms: true,
    };
    if (destination.trim()) body.destination = { address: destination.trim() };
    if (isOutstation) body.scheduledEnd = istInputToIso(end);
    if (pkg) body.packageId = pkg.id;
    if (coupon.trim() && !pkg) body.couponCode = coupon.trim().toUpperCase();
    if (referral.trim()) body.referralCode = referral.trim().toUpperCase();
    if (isMonthly) {
      body.recurrence = {
        days,
        startTime,
        endTime,
        startDate: istInputToIso(`${startDate}T00:00`),
        endDate: istInputToIso(`${endDate}T23:59`),
        returnPickup: returnPickup.trim() || undefined,
      };
    }

    setBusy(true);
    try {
      const b = await api<{ id: string }>("/bookings", { method: "POST", body });
      // Stay disabled while the confirmation route loads so a slow navigation
      // cannot turn a double-click into two bookings.
      router.push(`/bookings/${b.id}?new=1`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          const here = `${window.location.pathname}${window.location.search}`;
          router.replace(`/login?next=${encodeURIComponent(here)}`);
          return;
        }
        setError(err.message);
        setFields(err.fieldErrors ?? {});
      } else setError("Could not submit your booking. Please try again.");
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <PublicShell>
        <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-slate-500">Loading your account…</div>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <div className="mx-auto max-w-6xl px-4 py-8 pb-28 lg:pb-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Book a driver</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Book a verified driver</h1>
            <p className="mt-1 text-sm text-slate-500">
              Booking as <strong className="text-slate-800">{account?.name ?? "your account"}</strong>
              {account?.phone ? <> · {account.phone}</> : null}. Your trip is saved to My Trips automatically.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <Link href="/bookings" className="font-semibold text-emerald-700 hover:underline">My Trips</Link>
            <span aria-hidden="true">·</span>
            <a href={CONTACT_TEL} className="font-semibold text-slate-700 hover:text-emerald-700">{CONTACT_PHONE_DISPLAY}</a>
          </div>
        </div>

        {pkg && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <span>
              Package: <strong>{pkg.name}</strong> at a fixed {money(pkg.fixedPrice)} — details prefilled.
            </span>
            <button type="button" onClick={() => setPkg(null)} className="font-semibold underline hover:no-underline">
              Use standard fare
            </button>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <form onSubmit={submit} id="book-form" className="space-y-6 lg:col-span-2" noValidate>
            {error && <Alert>{error}</Alert>}

            <Card>
              <h2 className="font-semibold">1. Your trip</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Service type" error={fields.serviceType}>
                  <Select
                    value={service}
                    onChange={(e) => {
                      const next = e.target.value as Service;
                      setService(next);
                      setPkg(null);
                      if (next !== "hourly") setCoupon("");
                      if (next === "outstation_one_way" || next === "outstation_round_trip" || next === "monthly_office") {
                        setImmediate(false);
                        setImmediateAt(null);
                      }
                    }}
                  >
                    {Object.entries(SERVICE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </Select>
                </Field>
                <Field label="Car transmission">
                  <Select value={transmission} onChange={(e) => setTransmission(e.target.value as "manual" | "automatic")}>
                    <option value="manual">Manual</option>
                    <option value="automatic">Automatic</option>
                  </Select>
                </Field>
                <Field label="Car make & model *" error={fields.carModel}>
                  <Input value={carModel} onChange={(e) => setCarModel(e.target.value)} placeholder="e.g. Maruti Swift" invalid={!!fields.carModel} />
                </Field>
                {!isMonthly && !isOutstation && (
                  <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={immediate}
                      onChange={(e) => {
                        setImmediate(e.target.checked);
                        setImmediateAt(e.target.checked ? new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 16) : null);
                      }}
                      className="h-4 w-4 accent-emerald-600"
                    />
                    Need a driver now
                  </label>
                )}
                {!isMonthly && (
                  <Field label="Start date & time (IST) *" error={fields.scheduledStart}>
                    <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} disabled={immediate} />
                  </Field>
                )}
                {isFixed && (
                  <Field label="Duration" hint="Package length is fixed.">
                    <Input value={service === "half_day" ? "4 hours" : "8 hours"} disabled readOnly />
                  </Field>
                )}
                {!isFixed && !isOutstation && !isMonthly && (
                  <HourSelector
                    value={hours}
                    onChange={(h) => {
                      setHours(h);
                      setPkg(null);
                    }}
                    serviceType={service}
                    error={fields.durationHours}
                  />
                )}
                {isOutstation && (
                  <>
                    <Field
                      label={service === "outstation_round_trip" ? "Return date & time (IST) *" : "Trip end date & time (IST) *"}
                      error={fields.scheduledEnd}
                      hint={`Trip length: ${effectiveHours ? effectiveHours.toFixed(1) : 0} hours`}
                    >
                      <Input type="datetime-local" value={end} onChange={(e) => { setEnd(e.target.value); setPkg(null); }} />
                    </Field>
                    {service === "outstation_round_trip" && (
                      <Field label="Night halts" hint="₹399 per night.">
                        <Input type="number" min={0} max={30} value={nights} onChange={(e) => { setNights(Number(e.target.value)); setPkg(null); }} />
                      </Field>
                    )}
                  </>
                )}
                {isMonthly && (
                  <>
                    <Field label="Schedule start date" error={fields.startDate}>
                      <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPkg(null); }} />
                    </Field>
                    <Field label="Schedule end date">
                      <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPkg(null); }} />
                    </Field>
                    <Field label="Daily start time">
                      <Input type="time" value={startTime} onChange={(e) => { setStartTime(e.target.value); setPkg(null); }} />
                    </Field>
                    <Field label="Daily end time">
                      <Input type="time" value={endTime} onChange={(e) => { setEndTime(e.target.value); setPkg(null); }} />
                    </Field>
                    <div className="md:col-span-2">
                      <span className="mb-1 block text-sm font-medium text-slate-700">Working days</span>
                      <div className="flex flex-wrap gap-2">
                        {DAYS.map((d, i) => (
                          <button
                            type="button"
                            key={d}
                            onClick={() => { toggleDay(i); setPkg(null); }}
                            className={`rounded-lg px-3 py-1.5 text-sm ring-1 ${days.includes(i) ? "bg-emerald-600 text-white ring-emerald-600" : "bg-white ring-slate-300"}`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                      {fields.days && <p className="mt-1 text-xs text-rose-600">{fields.days}</p>}
                    </div>
                  </>
                )}
              </div>
            </Card>

            <Card>
              <h2 className="font-semibold">2. Pickup & drop</h2>
              <div className="mt-4 grid gap-4">
                <Field label="Pickup address *" error={fields.pickup}>
                  <Textarea rows={2} value={pickup} onChange={(e) => setPickup(e.target.value)} placeholder="House/flat, street, locality in Bhubaneswar" />
                </Field>
                {needsDestination && (
                  <Field label={isMonthly ? "Office / drop address *" : "Drop / destination address *"} error={fields.destination}>
                    <Textarea rows={2} value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Drop location, office or outstation destination" />
                  </Field>
                )}
                {isMonthly && (
                  <Field label="Return pickup (if different)">
                    <Textarea rows={2} value={returnPickup} onChange={(e) => setReturnPickup(e.target.value)} />
                  </Field>
                )}
                <Field label="Special notes (optional)">
                  <Textarea rows={2} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Parking, luggage, gate instructions…" />
                </Field>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700 space-y-1.5">
                  <p className="font-semibold text-slate-900">Good to know</p>
                  <p><span className="font-semibold text-emerald-700">You pay:</span> tolls, parking, fuel, and the driver&apos;s food/stay/return travel on applicable trips.</p>
                  <p><span className="font-semibold text-emerald-700">We cover:</span> damage to your vehicle while our driver is driving is our direct operational responsibility.</p>
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="font-semibold">3. Confirm</h2>
              <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 ring-1 ring-emerald-200">
                No advance payment. Pay by cash or UPI after your trip.
              </div>

              <details className="mt-4 rounded-lg border border-slate-200 p-3">
                <summary className="cursor-pointer text-sm font-medium text-slate-700">Have a coupon or referral code?</summary>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <Field label="Coupon code" error={fields.couponCode} hint={pkg ? "Packages use a fixed fare." : "New here? Try LAUNCH99."}>
                    <Input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="LAUNCH99" disabled={!!pkg} />
                  </Field>
                  <Field label="Referral code" error={fields.referralCode} hint="Got a friend's code? Enter it here.">
                    <Input value={referral} onChange={(e) => setReferral(e.target.value.toUpperCase())} placeholder="DVXXXXXX" />
                  </Field>
                </div>
              </details>

              <label className="mt-4 flex items-start gap-2 text-sm">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 h-4 w-4 accent-emerald-600" />
                <span>
                  I agree to the <a href="/terms" target="_blank" rel="noreferrer" className="font-medium text-emerald-800 underline">Terms</a> and{" "}
                  <a href="/cancellation" target="_blank" rel="noreferrer" className="font-medium text-emerald-800 underline">Cancellation policy</a>. *
                </span>
              </label>
              {fields.agreedToTerms && <p className="mt-1 text-xs text-rose-600">{fields.agreedToTerms}</p>}

              <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">We confirm driver availability after you book.</p>
                <Button type="submit" disabled={busy} className="px-8 py-3">{busy ? "Booking…" : "Book Now"}</Button>
              </div>
            </Card>
          </form>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Card>
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">Your estimate</h2>
                <Link href="/pricing" className="text-xs font-semibold text-emerald-700 hover:underline">Full pricing</Link>
              </div>
              {estLoading && <p className="mt-3 text-sm text-slate-500">Calculating…</p>}
              {estError && <p className="mt-3 text-sm text-rose-700">{estError}</p>}
              {!estimate && !estLoading && !estError && (
                <p className="mt-3 text-sm text-slate-500">Fill in your trip details to see an estimate.</p>
              )}
              {estimate && (
                <>
                  <p className="mt-3 text-3xl font-semibold">{money(estimate.total)}</p>
                  <p className="text-xs text-slate-500">Estimate only. Final fare confirmed by our team.</p>
                  <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
                    {estimate.lines.map((l, i) => (
                      <li key={i} className="flex justify-between gap-3">
                        <span className="text-slate-600">{l.label}</span>
                        <span>{money(l.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <Button type="submit" form="book-form" disabled={busy} className="mt-5 w-full py-3">
                {busy ? "Booking…" : "Book Now"}
              </Button>
              <p className="mt-2 text-center text-xs text-slate-500">No advance payment. Pay after the trip.</p>
            </Card>

            <Card className="mt-4">
              <h2 className="font-semibold">What happens next</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-600">
                <li>We confirm a verified driver for your slot.</li>
                <li>Driver details appear in <Link href="/bookings" className="font-medium text-emerald-700 underline">My Trips</Link>.</li>
                <li>Pay by cash or UPI after the trip.</li>
              </ol>
            </Card>

            <Card className="mt-4">
              <p className="text-sm text-slate-600">Need help choosing?</p>
              <a href={CONTACT_TEL} className="mt-1 block text-lg font-semibold text-emerald-700 hover:underline">{CONTACT_PHONE_DISPLAY}</a>
              <p className="mt-1 text-xs text-slate-500">Our Bhubaneswar dispatch team is available 24×7.</p>
            </Card>
          </aside>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500">Estimated total</p>
              <p className="text-lg font-semibold leading-tight">{estimate ? money(estimate.total) : "—"}</p>
            </div>
            <Button type="submit" form="book-form" disabled={busy} className="px-6 py-3">{busy ? "Booking…" : "Book Now"}</Button>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
