"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { PublicShell } from "@/components/PublicShell";
import { Alert, Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { money, SERVICE_LABEL, istInputToIso } from "@/lib/format";

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
  return (
    <Suspense fallback={<PublicShell><div className="p-10 text-sm text-slate-500">Loading…</div></PublicShell>}>
      <BookForm />
    </Suspense>
  );
}

function BookForm() {
  const search = useSearchParams();
  const [service, setService] = useState<Service>("hourly");
  const [immediate, setImmediate] = useState(false);
  const [immediateAt, setImmediateAt] = useState<string | null>(null);
  const [start, setStart] = useState(() => istDefaultStart());
  const [hours, setHours] = useState(1);
  const [end, setEnd] = useState("");
  const [nights, setNights] = useState(0);
  const [pickup, setPickup] = useState("");
  const [landmark, setLandmark] = useState("");
  const [destination, setDestination] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carNumber, setCarNumber] = useState("");
  const [transmission, setTransmission] = useState<"manual" | "automatic">("manual");
  const [instructions, setInstructions] = useState("");
  const [coupon, setCoupon] = useState("LAUNCH99");
  const [referral, setReferral] = useState("");
  const [pkg, setPkg] = useState<any | null>(null);

  // Package / service deep links (?package=id, ?service=type)
  useEffect(() => {
    const svc = search.get("service");
    if (svc && svc in SERVICE_LABEL) {
      setService(svc as Service);
      if (svc !== "hourly") setCoupon("");
    }
    const pid = search.get("package");
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
        setCoupon(""); // packages have fixed fares; no coupon combo
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [returnPickup, setReturnPickup] = useState("");

  // Fast-booking contact (PDF §3.1) — no sign-in required
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpNeeded, setOtpNeeded] = useState(true); // cleared automatically if the server has OTP off
  const [whatsapp, setWhatsapp] = useState("");
  const [sameWa, setSameWa] = useState(true);
  const [altContact, setAltContact] = useState("");
  const [language, setLanguage] = useState("");
  const [payment, setPayment] = useState<"online" | "cash_upi">("cash_upi");
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);

  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [estError, setEstError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ bookingNumber: string; id: string } | null>(null);

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

  const effectiveStart = isMonthly && startDate ? `${startDate}T${startTime}` : start;
  const estimateStart = !isMonthly && immediate && immediateAt ? immediateAt : effectiveStart;

  async function refreshEstimate() {
    if (pkg) {
      setEstimate({ total: pkg.fixedPrice, lines: [{ label: `Package: ${pkg.name}`, amount: pkg.fixedPrice }], usesUnconfirmedRules: false });
      setEstError(null);
      return;
    }    if (!estimateStart || !(effectiveHours > 0)) {
      setEstimate(null);
      return;
    }
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
  }

  async function sendOtp() {
    setError(null);
    setNotice(null);
    if (phone.trim().length < 10) {
      setError("Enter your mobile number first, then tap Send code.");
      return;
    }
    try {
      const r = await api<{ debugCode?: string }>(`/auth/otp/request`, {
        method: "POST",
        body: { phone: phone.trim(), purpose: "guest_booking" },
        auth: false,
      });
      setOtpSent(true);
      setOtpNeeded(true);
      if (r.debugCode) setNotice(`Your demo code is ${r.debugCode} (dev only — real SMS in production).`);
      else setNotice("Code sent by SMS. Enter it below.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        // OTP_ENABLED=false: proceed without code.
        setOtpNeeded(false);
        setError(null);
      } else setError(err instanceof ApiError ? err.message : "Could not send code.");
    }
  }

  function toggleDay(d: number) {
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFields({});
    const local: Record<string, string> = {};
    if (name.trim().length < 2) local.name = "Enter your full name.";
    if (phone.trim().length < 10) local.phone = "Enter a valid mobile number.";
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) local.email = "Enter a valid email.";
    if (otpNeeded && !/^\d{6}$/.test(otp)) local.otp = otpSent ? "Enter the 6-digit code." : "Tap Send code first, then enter the code.";
    if (pickup.trim().length < 5) local.pickup = "Enter a pickup address (at least 5 characters).";
    if (needsDestination && destination.trim().length < 5) local.destination = "Enter the destination or office address.";
    if (carModel.trim().length < 2) local.carModel = "Enter your car model.";
    if (!immediate && !effectiveStart) local.scheduledStart = "Choose a start date and time.";
    if (isOutstation && !end) local.scheduledEnd = "Enter the return date and time.";
    if (isMonthly && days.length === 0) local.days = "Choose at least one working day.";
    if (isMonthly && (!startDate || !endDate)) local.startDate = "Choose the schedule start and end dates.";
    if (!(effectiveHours > 0)) local.durationHours = "Duration must be more than zero.";
    if (!agreed) local.agreedToTerms = "Please accept the Terms and Cancellation policy.";
    setFields(local);
    if (Object.keys(local).length) return;

    const startIso = immediate ? new Date().toISOString() : istInputToIso(effectiveStart);
    const wa = sameWa ? phone.trim() : whatsapp.trim();
    const body: Record<string, unknown> = {
      name: name.trim(),
      phone: phone.trim(),
      ...(otpNeeded ? { otp } : {}),
      ...(pkg ? { packageId: pkg.id } : {}),
      ...(coupon.trim() && !pkg ? { couponCode: coupon.trim().toUpperCase() } : {}),
      ...(referral.trim() ? { referralCode: referral.trim().toUpperCase() } : {}),
      serviceType: service,
      immediate,
      pickup: { address: pickup.trim() },
      scheduledStart: startIso,
      durationHours: effectiveHours,
      nights: isOutstation ? nights : 0,
      carModel: carModel.trim(),
      transmission,
      instructions: instructions.trim(),
      paymentPreference: payment,
      agreedToTerms: true,
      ...(email.trim() ? { email: email.trim() } : {}),
      ...(wa ? { whatsapp: wa } : {}),
      ...(landmark.trim() ? { landmark: landmark.trim() } : {}),
      ...(carNumber.trim() ? { carNumber: carNumber.trim() } : {}),
      ...(altContact.trim() ? { altContact: altContact.trim() } : {}),
      ...(language ? { driverLanguage: language } : {}),
    };
    if (destination.trim()) body.destination = { address: destination.trim() };
    if (isOutstation) body.scheduledEnd = istInputToIso(end);
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
      const b = await api<{ id: string; bookingNumber: string }>(`/bookings/guest`, { method: "POST", body, auth: false });
      setDone({ bookingNumber: b.bookingNumber, id: b.id });
      window.scrollTo({ top: 0 });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFields(err.fieldErrors ?? {});
      } else setError("Could not submit your booking. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <PublicShell>
        <div className="mx-auto max-w-2xl px-4 py-10">
          <Card>
            <p className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">Booking received</p>
            <h1 className="mt-3 font-mono text-3xl font-semibold">{done.bookingNumber}</h1>
            <p className="mt-2 text-sm text-slate-600">Our team will confirm your driver shortly.</p>
            <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Keep this booking ID for future reference — you'll need it to track your booking.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={`/track?bookingNumber=${encodeURIComponent(done.bookingNumber)}&phone=${encodeURIComponent(phone.trim())}`} className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700">
                Track my booking
              </Link>
              <Link href="/register" className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium ring-1 ring-slate-300 hover:bg-slate-50">
                Create an account to save details
              </Link>
            </div>
            <button onClick={() => setDone(null)} className="mt-4 text-sm text-slate-500 underline">Book another</button>
          </Card>
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <div className="mx-auto max-w-6xl px-4 py-10 pb-28 lg:pb-10">
        <h1 className="text-2xl font-semibold tracking-tight">Book a driver — no sign-in needed</h1>
        <p className="mt-1 text-sm text-slate-600">Under a minute. Estimate up front, booking ID + tracking right after.</p>
        {pkg && (
          <p className="mt-3 inline-flex rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 ring-1 ring-emerald-200">
            Package: <strong className="mx-1">{pkg.name}</strong> at a fixed {money(pkg.fixedPrice)} — form prefilled.
          </p>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <form onSubmit={submit} id="book-form" className="space-y-6 lg:col-span-2" noValidate>
            {error && <Alert>{error}</Alert>}
            {notice && <Alert tone="success">{notice}</Alert>}

            <Card>
              <h2 className="font-semibold">1. Your details</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Full name *" error={fields.name}>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya Mohanty" invalid={!!fields.name} />
                </Field>
                <Field label="Mobile number *" error={fields.phone}>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" inputMode="tel" invalid={!!fields.phone} />
                </Field>
                <div className="md:col-span-2">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-40 flex-1">
                      <Field label="Mobile OTP *" error={fields.otp} hint="Tap Send code, then enter the 6-digit code.">
                        <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit code" inputMode="numeric" maxLength={6} />
                      </Field>
                    </div>
                    <Button type="button" variant="secondary" onClick={sendOtp}>{otpSent ? "Resend code" : "Send code"}</Button>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Stops fake bookings. The code comes by SMS (demo code shown here in dev).</p>
                </div>
                <label className="flex items-center gap-2 text-sm md:col-span-2">
                  <input type="checkbox" checked={sameWa} onChange={(e) => setSameWa(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
                  WhatsApp same as mobile
                </label>
                {!sameWa && (
                  <Field label="WhatsApp number">
                    <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="Optional" inputMode="tel" />
                  </Field>
                )}
                <Field label="Alternate contact (optional)">
                  <Input value={altContact} onChange={(e) => setAltContact(e.target.value)} placeholder="Family / office" inputMode="tel" />
                </Field>
                <Field label="Driver language (optional)">
                  <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
                    <option value="">No preference</option>
                    <option value="odia">Odia</option>
                    <option value="hindi">Hindi</option>
                    <option value="english">English</option>
                  </Select>
                </Field>
                <Field label="Payment preference *">
                  <Select value={payment} onChange={(e) => setPayment(e.target.value as "online" | "cash_upi")}>
                    <option value="cash_upi">Cash / UPI</option>
                    <option value="online">Online</option>
                  </Select>
                </Field>
                <Field label="Email (for booking confirmation)" error={fields.email} hint="Confirmation goes to this email.">
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" inputMode="email" invalid={!!fields.email} />
                </Field>
              </div>
            </Card>

            <Card>
              <h2 className="font-semibold">2. Service & car</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Service type" error={fields.serviceType}>
                  <Select value={service} onChange={(e) => setService(e.target.value as Service)}>
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
                <Field label="Car number (optional)">
                  <Input value={carNumber} onChange={(e) => setCarNumber(e.target.value.toUpperCase())} placeholder="OD 02 AB 1234" />
                </Field>
                <Field label="Coupon code (optional)" error={fields.couponCode}>
                  <Input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="LAUNCH99" />
                </Field>
                <Field label="Referral code (optional)" error={fields.referralCode} hint="Got a friend's code? Enter it here.">
                  <Input value={referral} onChange={(e) => setReferral(e.target.value.toUpperCase())} placeholder="DVXXXXXX" />
                </Field>
              </div>
            </Card>

            <Card>
              <h2 className="font-semibold">3. When</h2>
              {!isMonthly && (
                <label className="mt-4 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={immediate} onChange={(e) => { setImmediate(e.target.checked); setImmediateAt(e.target.checked ? new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 16) : null); }} className="h-4 w-4 accent-emerald-600" />
                  Need a driver now
                </label>
              )}
              <div className="mt-4 grid gap-4 md:grid-cols-2">
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
                  <Field label="Hours" error={fields.durationHours}>
                    <Input type="number" min={1} step={0.5} value={hours} onChange={(e) => setHours(Number(e.target.value))} />
                  </Field>
                )}
                {isOutstation && (
                  <>
                    <Field label="Return date & time (IST) *" error={fields.scheduledEnd} hint={`Trip length: ${effectiveHours ? effectiveHours.toFixed(1) : 0} hours`}>
                      <Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
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
                      <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </Field>
                    <Field label="Schedule end date">
                      <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </Field>
                    <Field label="Daily start time">
                      <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                    </Field>
                    <Field label="Daily end time">
                      <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                    </Field>
                    <div className="md:col-span-2">
                      <span className="mb-1 block text-sm font-medium text-slate-700">Working days</span>
                      <div className="flex flex-wrap gap-2">
                        {DAYS.map((d, i) => (
                          <button type="button" key={d} onClick={() => toggleDay(i)} className={`rounded-lg px-3 py-1.5 text-sm ring-1 ${days.includes(i) ? "bg-emerald-600 text-white ring-emerald-600" : "bg-white ring-slate-300"}`}>{d}</button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Card>

            <Card>
              <h2 className="font-semibold">4. Where</h2>
              <div className="mt-4 grid gap-4">
                <Field label="Pickup address *" error={fields.pickup}>
                  <Textarea rows={2} value={pickup} onChange={(e) => setPickup(e.target.value)} placeholder="House/flat, street, locality" />
                </Field>
                <Field label="Landmark (optional)">
                  <Input value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="Near… " />
                </Field>
                {needsDestination && (
                  <Field label="Drop / destination address *" error={fields.destination}>
                    <Textarea rows={2} value={destination} onChange={(e) => setDestination(e.target.value)} />
                  </Field>
                )}
                {isMonthly && (
                  <Field label="Return pickup (if different)">
                    <Textarea rows={2} value={returnPickup} onChange={(e) => setReturnPickup(e.target.value)} />
                  </Field>
                )}
                <Field label="Special notes (optional)">
                  <Textarea rows={3} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Parking, luggage, what to carry…" />
                </Field>
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 h-4 w-4 accent-emerald-600" />
                  <span>I agree to the <a href="/terms" target="_blank" rel="noreferrer" className="underline">Terms</a> and <a href="/cancellation" target="_blank" rel="noreferrer" className="underline">Cancellation policy</a>. *</span>
                </label>
                {fields.agreedToTerms && <p className="text-xs text-rose-600">{fields.agreedToTerms}</p>}
              </div>
            </Card>

            <div className="flex items-center justify-between gap-4">
              <Button type="button" variant="secondary" onClick={refreshEstimate}>See estimate</Button>
              <Button type="submit" disabled={busy} className="max-lg:hidden">{busy ? "Submitting…" : "Book — see estimate first"}</Button>
            </div>
          </form>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <Card>
              <h2 className="font-semibold">Estimate</h2>
              {estError && <p className="mt-3 text-sm text-rose-700">{estError}</p>}
              {!estimate && !estError && <p className="mt-3 text-sm text-slate-500">Press “See estimate” — clearly marked as estimate before you confirm.</p>}
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
              <div className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-600">
                <p>· Tolls, parking, fuel and the driver's food, stay and return travel are paid by you (the customer).</p>
                <p>· Damage to your vehicle while our driver is driving is the driver's responsibility.</p>
              </div>
            </Card>
          </aside>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500">Estimated total</p>
              <p className="text-lg font-semibold leading-tight">{estimate ? money(estimate.total) : "—"}</p>
            </div>
            <Button type="submit" form="book-form" disabled={busy} className="px-6 py-3">{busy ? "Submitting…" : "Book now"}</Button>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
