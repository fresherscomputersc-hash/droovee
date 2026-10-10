"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PublicShell } from "@/components/PublicShell";
import { Alert, Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { getSession } from "@/lib/session";
import { money, SERVICE_LABEL, istInputToIso } from "@/lib/format";

type Service = keyof typeof SERVICE_LABEL;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Estimate {
  total: number;
  lines: { label: string; amount: number }[];
  usesUnconfirmedRules: boolean;
}

/** Default start: one hour from now, rounded up to the next whole IST hour. */
function istDefaultStart() {
  const istNow = Date.now() + 330 * 60_000;
  const rounded = Math.ceil((istNow + 60 * 60_000) / 3_600_000) * 3_600_000;
  // toISOString of the shifted instant renders the IST wall time.
  return new Date(rounded).toISOString().slice(0, 16);
}

export default function BookPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [service, setService] = useState<Service>("hourly");
  const [immediate, setImmediate] = useState(false);
  /** Frozen timestamp for the live estimate while "immediate" is on (else it would drift every render). */
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
  // Monthly recurrence
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [returnPickup, setReturnPickup] = useState("");

  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [estError, setEstError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (!s || s.kind !== "customer") router.replace("/login?next=/book");
    else setReady(true);
  }, [router]);

  const isFixed = service === "half_day" || service === "full_day";
  const isOutstation = service === "outstation_one_way" || service === "outstation_round_trip";
  const isMonthly = service === "monthly_office";
  const needsDestination = isOutstation || service === "airport_pickup_drop" || isMonthly;

  // Effective duration sent to the API.
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

  const effectiveStart = isMonthly && startDate ? `${startDate}T${startTime}` : start;
  // The live estimate must price what the booking will actually use: "now"
  // when immediate (frozen at toggle-on to avoid drifting every render).
  const estimateStart = !isMonthly && immediate && immediateAt ? immediateAt : effectiveStart;

  // Live estimate, debounced.
  useEffect(() => {
    if (!ready) return;
    if (!estimateStart || !(effectiveHours > 0)) {
      setEstimate(null);
      return;
    }
    const t = setTimeout(async () => {
      setEstError(null);
      try {
        const q = new URLSearchParams({
          serviceType: service,
          durationHours: String(effectiveHours),
          startAt: istInputToIso(estimateStart),
          nights: String(isOutstation ? nights : 0),
        });
        if (coupon.trim()) q.set("couponCode", coupon.trim());
        const e = await api<Estimate>(`/pricing/estimate?${q.toString()}`, { auth: false });
        setEstimate(e);
      } catch (err) {
        setEstimate(null);
        setEstError(err instanceof ApiError ? err.message : "Could not calculate the estimate.");
      }
    }, 350);
    return () => clearTimeout(t);
  }, [ready, service, effectiveHours, estimateStart, nights, coupon, isOutstation]);

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
    if (!immediate && !effectiveStart) local.scheduledStart = "Choose a start date and time.";
    if (isOutstation && !end) local.scheduledEnd = "Enter the return date and time.";
    if (isMonthly && days.length === 0) local.days = "Choose at least one working day.";
    if (isMonthly && (!startDate || !endDate)) local.startDate = "Choose the schedule start and end dates.";
    if (!(effectiveHours > 0)) local.durationHours = "Duration must be more than zero.";
    setFields(local);
    if (Object.keys(local).length) return;

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
    };
    if (destination.trim()) body.destination = { address: destination.trim() };
    if (isOutstation) body.scheduledEnd = istInputToIso(end);
    if (coupon.trim()) body.couponCode = coupon.trim().toUpperCase();
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
      router.push(`/bookings/${b.id}?new=1`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFields(err.fieldErrors ?? {});
      } else setError("Could not submit your booking. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;

  return (
    <PublicShell>
      <div className="mx-auto max-w-6xl px-4 py-10 pb-28 lg:pb-10">
        <h1 className="text-2xl font-semibold tracking-tight">Book a driver</h1>
        <p className="mt-1 text-sm text-slate-600">Your own car, a professional driver. We confirm your booking and assign a driver.</p>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <form onSubmit={submit} id="book-form" className="space-y-6 lg:col-span-2" noValidate>
            {error && <Alert>{error}</Alert>}

            <Card>
              <h2 className="font-semibold">1. Service</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Service type" error={fields.serviceType}>
                  <Select value={service} onChange={(e) => { setService(e.target.value as Service); setHours(e.target.value === "hourly" ? 1 : hours); }}>
                    {Object.entries(SERVICE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </Select>
                </Field>
                <Field label="Car transmission" error={fields.transmission}>
                  <Select value={transmission} onChange={(e) => setTransmission(e.target.value as "manual" | "automatic")}>
                    <option value="manual">Manual</option>
                    <option value="automatic">Automatic</option>
                  </Select>
                </Field>
                <Field label="Car model" error={fields.carModel}>
                  <Input value={carModel} onChange={(e) => setCarModel(e.target.value)} placeholder="e.g. Maruti Swift" invalid={!!fields.carModel} />
                </Field>
                <Field label="Coupon code (optional)" error={fields.couponCode}>
                  <Input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="LAUNCH99" invalid={!!fields.couponCode} />
                </Field>
              </div>
            </Card>

            <Card>
              <h2 className="font-semibold">2. When</h2>
              {!isMonthly && (
                <label className="mt-4 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={immediate}
                    onChange={(e) => {
                      setImmediate(e.target.checked);
                      // IST wall time ("2026-…T10:05"), matching the other inputs.
                      setImmediateAt(e.target.checked ? new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 16) : null);
                    }}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  Book for now (immediate)
                </label>
              )}
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {!isMonthly && (
                  <Field label="Start date & time (IST)" error={fields.scheduledStart}>
                    <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} disabled={immediate} invalid={!!fields.scheduledStart} />
                  </Field>
                )}
                {isFixed && (
                  <Field label="Duration" hint="Package length is fixed.">
                    <Input value={service === "half_day" ? "4 hours" : "8 hours"} disabled readOnly />
                  </Field>
                )}
                {!isFixed && !isOutstation && !isMonthly && (
                  <Field label="Hours" error={fields.durationHours} hint="First hour is included in the base price; extra hours at ₹89/hour.">
                    <Input type="number" min={1} step={0.5} value={hours} onChange={(e) => setHours(Number(e.target.value))} invalid={!!fields.durationHours} />
                  </Field>
                )}
                {isOutstation && (
                  <>
                    <Field label="Return date & time (IST)" error={fields.scheduledEnd} hint={`Trip length: ${effectiveHours ? effectiveHours.toFixed(1) : 0} hours`}>
                      <Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} invalid={!!fields.scheduledEnd} />
                    </Field>
                    {service === "outstation_round_trip" && (
                      <Field label="Night halts" hint="₹399 per night.">
                        <Input type="number" min={0} max={30} value={nights} onChange={(e) => setNights(Number(e.target.value))} />
                      </Field>
                    )}
                  </>
                )}
                {isMonthly && (
                  <>
                    <Field label="Schedule start date" error={fields.startDate}>
                      <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} invalid={!!fields.startDate} />
                    </Field>
                    <Field label="Schedule end date">
                      <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </Field>
                    <Field label="Daily start time">
                      <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                    </Field>
                    <Field label="Daily end time" hint={`${effectiveHours} hours per working day`}>
                      <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                    </Field>
                    <div className="md:col-span-2">
                      <span className="mb-1 block text-sm font-medium text-slate-700">Working days</span>
                      <div className="flex flex-wrap gap-2">
                        {DAYS.map((d, i) => (
                          <button
                            type="button"
                            key={d}
                            onClick={() => toggleDay(i)}
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
              <h2 className="font-semibold">3. Where</h2>
              <div className="mt-4 grid gap-4">
                <Field label={isMonthly ? "Pickup address (home)" : "Pickup address"} error={fields.pickup}>
                  <Textarea rows={2} value={pickup} onChange={(e) => setPickup(e.target.value)} placeholder="House/flat, street, locality" />
                </Field>
                {needsDestination && (
                  <Field
                    label={isMonthly ? "Office address" : service === "airport_pickup_drop" ? "Airport / railway / bus-stop and drop address" : "Destination"}
                    error={fields.destination}
                  >
                    <Textarea rows={2} value={destination} onChange={(e) => setDestination(e.target.value)} />
                  </Field>
                )}
                {isMonthly && (
                  <Field label="Return pickup (if different)">
                    <Textarea rows={2} value={returnPickup} onChange={(e) => setReturnPickup(e.target.value)} />
                  </Field>
                )}
                <Field label="Notes for the driver (optional)" error={fields.instructions}>
                  <Textarea rows={3} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Landmarks, parking, what to carry…" />
                </Field>
              </div>
            </Card>

            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-slate-500">By booking you agree to our terms. The final fare is confirmed by our team.</p>
              <Button type="submit" disabled={busy} className="max-lg:hidden">{busy ? "Submitting…" : "Request booking"}</Button>
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
              <li><span className="mr-1 text-emerald-600">✓</span>Salaried, trained drivers</li>
              <li><span className="mr-1 text-emerald-600">✓</span>Estimate up front — no hidden charges</li>
              <li><span className="mr-1 text-emerald-600">✓</span>Driver details shared on confirmation</li>
            </ul>
          </form>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <Card>
              <h2 className="font-semibold">Estimate</h2>
              {!isMonthly && immediate && immediateAt && (
                <p className="mt-1 text-xs text-slate-500">Priced for right now — late-night and demand charges included.</p>
              )}
              {estError && <p className="mt-3 text-sm text-rose-700">{estError}</p>}
              {!estimate && !estError && <p className="mt-3 text-sm text-slate-500">Choose a service and time to see your estimate.</p>}
              {estimate && (
                <>
                  <p className="mt-3 text-3xl font-semibold">{money(estimate.total)}</p>
                  <p className="text-xs text-slate-500">Estimate only. Final fare may change and is confirmed before your driver is assigned.</p>
                  {(() => {
                    const denom = estimate.lines.reduce((s, l) => s + Math.abs(l.amount), 0) || 1;
                    return (
                      <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-slate-100" role="img" aria-label="Fare breakdown">
                        {estimate.lines.map((l, i) => (
                          <div
                            key={i}
                            title={`${l.label}: ${money(l.amount)}`}
                            style={{ width: `${(Math.abs(l.amount) / denom) * 100}%` }}
                            className={l.amount < 0 ? "bg-emerald-300" : "bg-emerald-600"}
                          />
                        ))}
                      </div>
                    );
                  })()}
                  <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
                    {estimate.lines.map((l, i) => (
                      <li key={i} className="flex justify-between gap-3">
                        <span className="text-slate-600">{l.label}</span>
                        <span className={l.amount < 0 ? "text-emerald-700" : ""}>{money(l.amount)}</span>
                      </li>
                    ))}
                  </ul>
                  {estimate.usesUnconfirmedRules && (
                    <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
                      Some charges for combined services are still being finalised. Our team will confirm the exact fare with you.
                    </p>
                  )}
                </>
              )}
            </Card>
          </aside>
        </div>

        {/* Sticky mobile booking bar: total + CTA always in reach. */}
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500">Estimated total</p>
              <p className="text-lg font-semibold leading-tight">{estimate ? money(estimate.total) : "—"}</p>
            </div>
            <Button type="submit" form="book-form" disabled={busy} className="px-6 py-3">
              {busy ? "Submitting…" : "Request booking"}
            </Button>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
