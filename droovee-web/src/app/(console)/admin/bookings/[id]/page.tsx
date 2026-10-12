"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Empty, Field, Input, PageTitle, Select, StatusBadge, Table } from "@/components/ui";
import { can } from "@/components/AdminShell";
import { api, ApiError } from "@/lib/api";
import { getSession } from "@/lib/session";
import { dateTime, money, SERVICE_LABEL, STATUS_LABEL } from "@/lib/format";

// Mirrors the server's allowed transitions (src/domain/status.ts). The server is authoritative.
const NEXT: Record<string, string[]> = {
  requested: ["confirmed", "rejected", "cancelled"],
  confirmed: ["driver_assigned", "cancelled", "rejected", "customer_no_show"],
  driver_assigned: ["driver_on_the_way", "confirmed", "cancelled", "customer_no_show"],
  driver_on_the_way: ["in_progress", "driver_assigned", "cancelled", "customer_no_show"],
  in_progress: ["completed"],
  completed: [],
  cancelled: [],
  rejected: [],
  customer_no_show: [],
};

type Conflict = { kind: string; ref?: string; start: string; end: string };

export default function AdminBookingDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const role = getSession()?.role;
  const [b, setB] = useState<any | null>(null);
  const [options, setOptions] = useState<any[] | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Assignment state
  const [pickDriver, setPickDriver] = useState("");
  const [conflicts, setConflicts] = useState<Conflict[] | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [reassignReason, setReassignReason] = useState("");

  // Status state
  const [toStatus, setToStatus] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [finalFare, setFinalFare] = useState("");
  const [fee, setFee] = useState("");
  const [refund, setRefund] = useState("");

  // Contact, fare, payment
  const [channel, setChannel] = useState<"call" | "whatsapp">("call");
  // Driver link + trip codes (Phase 3)
  const [links, setLinks] = useState<{ driverToken?: string; shareToken?: string; tripCodeStart?: string; tripCodeEnd?: string } | null>(null);

  async function issueLinks() {
    const ok = await run(() => api(`/admin/bookings/${id}/driver-link`, { method: "POST", body: {} }).then((r: any) => setLinks(r)), "Driver link issued. Share it with the driver, codes with the customer.");
    if (!ok) setLinks(null);
  }  const [result, setResult] = useState<"not_contacted" | "contacted" | "confirmed" | "declined" | "unreachable">("contacted");
  const [contactNotes, setContactNotes] = useState("");
  const [newFare, setNewFare] = useState("");
  const [fareReason, setFareReason] = useState("");
  const [cashAmount, setCashAmount] = useState("");
  const [cashRef, setCashRef] = useState("");

  const load = useCallback(async () => {
    try {
      const [bk, pay, msg] = await Promise.all([
        api(`/admin/bookings/${id}`),
        api<{ items: any[] }>(`/admin/bookings/${id}/payments`).catch(() => ({ items: [] })),
        api<{ items: any[] }>(`/admin/bookings/${id}/notifications`).catch(() => ({ items: [] })),
      ]);
      setB(bk);
      setPayments(pay.items);
      setMessages(msg.items);
      if (can(role, "drivers:read")) {
        const d = await api<{ items: any[] }>(`/admin/bookings/${id}/driver-options`).catch(() => null);
        setOptions(d?.items ?? null);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load this booking.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const allowedNext = useMemo(() => (b ? NEXT[b.status] ?? [] : []), [b]);
  const alreadyAssigned = !!b?.driverId;
  const canAssign = can(role, "bookings:assign") && ["confirmed", "driver_assigned"].includes(b?.status);

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
      setNotice(ok);
      await load();
      return true;
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
        // Stale view: pull the latest version so the next action is current.
        if (e.status === 409) await load().catch(() => {});
      } else setError("Something went wrong. Try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function assign(withOverride: boolean) {
    setConflicts(null);
    const path = alreadyAssigned ? "reassign" : "assign";
    const body: Record<string, unknown> = { driverId: pickDriver, expectedVersion: b.version };
    if (withOverride) body.overrideReason = overrideReason.trim();
    if (alreadyAssigned) body.reassignReason = reassignReason.trim();
    setBusy(true);
    setError(null);
    try {
      const r: any = await api(`/admin/bookings/${id}/${path}`, { method: "PATCH", body });
      if (r?.driverToken) {
        setLinks({ driverToken: r.driverToken, shareToken: r.shareToken, tripCodeStart: r.tripCodeStart, tripCodeEnd: r.tripCodeEnd });
      }
      setNotice(alreadyAssigned ? "Driver reassigned." : "Driver assigned. Now record the driver's confirmation.");
      setOverrideReason("");
      setReassignReason("");
      await load();
    } catch (e) {
      if (e instanceof ApiError && e.details?.code === "DRIVER_CONFLICT_WARNING") {
        setConflicts(e.details.conflicts as Conflict[]);
      } else {
        setError(e instanceof ApiError ? e.message : "Could not assign the driver.");
        if (e instanceof ApiError && e.status === 409) await load().catch(() => {});
      }
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(e: React.FormEvent) {
    e.preventDefault();
    const body: Record<string, unknown> = { to: toStatus, expectedVersion: b.version };
    if (statusReason.trim()) body.reason = statusReason.trim();
    if (finalFare !== "") body.finalFare = Number(finalFare);
    if (fee !== "") body.feeAmount = Number(fee);
    if (refund !== "") body.refundAmount = Number(refund);
    const ok = await run(() => api(`/admin/bookings/${id}/status`, { method: "PATCH", body }), `Status changed to ${STATUS_LABEL[toStatus]}.`);
    if (ok) {
      setToStatus("");
      setStatusReason("");
      setFinalFare("");
      setFee("");
      setRefund("");
    }
  }

  if (error && !b) return <Alert>{error}</Alert>;
  if (!b) return <p className="text-sm text-slate-500">Loading…</p>;

  const needsReason = ["cancelled", "rejected", "customer_no_show"].includes(toStatus);
  const confirmed = b.contactLog?.some((c: any) => c.result === "confirmed");

  return (
    <>
      <div className="mb-2"><Link href="/admin/bookings" className="text-sm text-emerald-700 hover:underline">← Bookings</Link></div>
      <PageTitle
        title={b.bookingNumber}
        subtitle={`${SERVICE_LABEL[b.serviceType]} · ${dateTime(b.scheduledStart)} → ${dateTime(b.scheduledEnd)}`}
        actions={<StatusBadge status={b.status} />}
      />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {notice && <div className="mb-4"><Alert tone="success">{notice}</Alert></div>}
      {b.cancellation?.requestedAt && !b.cancellation?.decidedAt && (
        <div className="mb-4"><Alert tone="warn">Customer requested cancellation: “{b.cancellation.requestReason}”. Decide the fee and refund below.</Alert></div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <h2 className="font-semibold">Customer & trip</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={`tel:${b.customer?.phone}`} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">📞 Call customer</a>
              <a href={`https://wa.me/${String(b.customer?.phone ?? "").replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium ring-1 ring-slate-300 hover:bg-slate-50">💬 WhatsApp customer</a>
              {b.driver?.phone && (
                <>
                  <a href={`tel:${b.driver.phone}`} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">📞 Call driver</a>
                  <a href={`https://wa.me/${String(b.driver.phone).replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium ring-1 ring-slate-300 hover:bg-slate-50">💬 WhatsApp driver</a>
                </>
              )}
              <Link href={`/admin/bookings/${id}/receipt`} className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 ring-1 ring-slate-300 hover:bg-slate-50">🧾 Receipt / invoice</Link>
            </div>
            <dl className="mt-4 grid gap-4 text-sm md:grid-cols-2">
              <Info k="Customer" v={`${b.customer?.name} · ${b.customer?.phone}`} />
              <Info k="Car" v={`${b.carModel} · ${b.transmission}`} />
              <Info k="Pickup" v={b.pickup?.address} />
              <Info k="Destination" v={b.destination?.address ?? "—"} />
              <Info k="Nights" v={b.serviceType?.startsWith("outstation") ? String(b.nights ?? 0) : "—"} />
              <Info k="Coupon" v={b.couponCode ?? "—"} />
              {b.instructions && <Info k="Customer notes" v={b.instructions} />}
              {b.recurrence && <Info k="Recurring schedule" v={`${b.recurrence.startTime}–${b.recurrence.endTime}, days ${b.recurrence.days.join(",")}`} />}
            </dl>
          </Card>

          <Card>
            <h2 className="font-semibold">Driver assignment</h2>
            {b.driver && (
              <p className="mt-2 text-sm">Assigned to <strong>{b.driver.name}</strong> ({b.driver.employeeCode}) · <a className="text-emerald-700 underline" href={`tel:${b.driver.phone}`}>{b.driver.phone}</a></p>
            )}
            {!canAssign && !b.driver && <p className="mt-2 text-sm text-slate-600">Assignment is available once the booking is confirmed.</p>}

            {canAssign && options && (
              <div className="mt-4 space-y-4">
                <Field label={alreadyAssigned ? "Reassign to" : "Choose a driver"}>
                  <Select value={pickDriver} onChange={(e) => { setPickDriver(e.target.value); setConflicts(null); }}>
                    <option value="">Select a driver…</option>
                    {options.filter((d) => d.id !== b.driverId).map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.employeeCode}) — {d.available ? "free for this slot" : `${d.conflicts.length} clash${d.conflicts.length > 1 ? "es" : ""}`}
                      </option>
                    ))}
                  </Select>
                </Field>
                {pickDriver && (() => {
                  const d = options.find((x) => x.id === pickDriver);
                  if (!d || d.available) return null;
                  return (
                    <Alert tone="warn">
                      <strong>{d.name}</strong> has overlapping commitments:
                      <ul className="mt-1 list-disc pl-5">
                        {d.conflicts.map((c: any, i: number) => <li key={i}>{c.kind === "booking" ? `Booking ${c.ref}` : `Unavailable (${c.ref})`}: {dateTime(c.start)} → {dateTime(c.end)}</li>)}
                      </ul>
                    </Alert>
                  );
                })()}
                {alreadyAssigned && (
                  <Field label="Reason for reassigning" hint="Required. Recorded in the audit log.">
                    <Input value={reassignReason} onChange={(e) => setReassignReason(e.target.value)} />
                  </Field>
                )}
                {conflicts && (
                  <Alert tone="warn">
                    The system found a clash. To assign anyway, enter the reason for overriding it. This is recorded.
                    <Field label="Override reason" hint="At least 5 characters.">
                      <Input value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} />
                    </Field>
                  </Alert>
                )}
                <div className="flex flex-wrap gap-2">
                  {!conflicts && (
                    <Button disabled={!pickDriver || busy || (alreadyAssigned && reassignReason.trim().length < 5)} onClick={() => assign(false)}>
                      {alreadyAssigned ? "Reassign driver" : "Assign driver"}
                    </Button>
                  )}
                  {conflicts && can(role, "conflict:override") && (
                    <Button variant="danger" disabled={busy || overrideReason.trim().length < 5} onClick={() => assign(true)}>Override and assign</Button>
                  )}
                  {conflicts && <Button variant="secondary" onClick={() => setConflicts(null)}>Pick another driver</Button>}
                </div>
              </div>
            )}

            {options && options.length > 0 && (
              <details className="mt-6">
                <summary className="cursor-pointer text-sm text-slate-600">Driver availability for this slot</summary>
                <div className="mt-3">
                  <Table head={["Driver", "Phone", "Availability"]}>
                    {options.map((d) => (
                      <tr key={d.id}>
                        <td className="px-4 py-2">{d.name} <span className="text-xs text-slate-500">{d.employeeCode}</span></td>
                        <td className="px-4 py-2">{d.phone}</td>
                        <td className="px-4 py-2">{d.available ? <span className="text-emerald-700">Free</span> : <span className="text-rose-700">{d.conflicts.length} clash(es)</span>}</td>
                      </tr>
                    ))}
                  </Table>
                </div>
              </details>
            )}
          </Card>

          {b.driverId && can(role, "bookings:assign") && (
            <Card>
              <h2 className="font-semibold">Driver link & trip codes</h2>
              <p className="mt-1 text-xs text-slate-500">Driver opens the link (no app). Codes go to the customer — they read them to the driver to start/end.</p>
              <div className="mt-3">
                <Button variant="secondary" onClick={issueLinks} disabled={busy}>Issue driver link + codes</Button>
              </div>
              {links && (
                <dl className="mt-4 space-y-2 rounded-lg bg-slate-50 p-3 font-mono text-xs">
                  <div className="flex flex-wrap justify-between gap-2"><dt className="font-sans text-slate-500">Driver link (WhatsApp to driver)</dt><dd className="break-all">{typeof window !== "undefined" ? `${window.location.origin}/d/${links.driverToken}` : `/d/${links.driverToken}`}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="font-sans text-slate-500">START code</dt><dd className="text-base font-bold">{links.tripCodeStart}</dd></div>
                  <div className="flex justify-between gap-2"><dt className="font-sans text-slate-500">END code</dt><dd className="text-base font-bold">{links.tripCodeEnd}</dd></div>
                  <div className="flex flex-wrap justify-between gap-2"><dt className="font-sans text-slate-500">Family share link</dt><dd className="break-all">{typeof window !== "undefined" ? `${window.location.origin}/share/${links.shareToken}` : `/share/${links.shareToken}`}</dd></div>
                </dl>
              )}
            </Card>
          )}

          {can(role, "bookings:status") && (
            <Card>
              <h2 className="font-semibold">Contact log & driver confirmation</h2>              {!b.driverId ? (
                <p className="mt-2 text-sm text-slate-600">Assign a driver before logging contact.</p>
              ) : (
                <form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await run(() => api(`/admin/bookings/${id}/contact-log`, { method: "POST", body: { channel, result, notes: contactNotes.trim() || undefined, expectedVersion: b.version } }), "Contact logged.");
                  if (ok) setContactNotes("");
                }}>
                  <Field label="Channel">
                    <Select value={channel} onChange={(e) => setChannel(e.target.value as any)}>
                      <option value="call">Phone call</option>
                      <option value="whatsapp">WhatsApp</option>
                    </Select>
                  </Field>
                  <Field label="Result">
                    <Select value={result} onChange={(e) => setResult(e.target.value as any)}>
                      <option value="contacted">Contacted</option>
                      <option value="confirmed">Driver confirmed</option>
                      <option value="declined">Driver declined</option>
                      <option value="unreachable">Unreachable</option>
                      <option value="not_contacted">Not contacted</option>
                    </Select>
                  </Field>
                  <Field label="Notes">
                    <Input value={contactNotes} onChange={(e) => setContactNotes(e.target.value)} />
                  </Field>
                  <div className="flex items-end"><Button type="submit" className="w-full" disabled={busy}>Log contact</Button></div>
                </form>
              )}
              {b.contactLog?.length > 0 && (
                <ul className="mt-4 space-y-2 text-sm">
                  {b.contactLog.map((c: any, i: number) => (
                    <li key={i} className="rounded-lg bg-slate-50 p-3">
                      <span className="font-medium">{c.channel === "call" ? "Call" : "WhatsApp"}</span> · {c.result.replace("_", " ")} · <span className="text-slate-500">{dateTime(c.at)}</span>
                      {c.notes && <p className="text-slate-600">{c.notes}</p>}
                    </li>
                  ))}
                </ul>
              )}
              {b.driverId && !confirmed && <p className="mt-3 text-xs text-amber-700">The driver must be confirmed before the trip can go on the way.</p>}
            </Card>
          )}

          {can(role, "bookings:status") && (
            <Card>
              <h2 className="font-semibold">Update status</h2>
              {allowedNext.length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">This booking is closed. No further status changes.</p>
              ) : (
                <form onSubmit={changeStatus} className="mt-4 space-y-4" noValidate>
                  <Field label="New status">
                    <Select value={toStatus} onChange={(e) => setToStatus(e.target.value)} required>
                      <option value="">Choose…</option>
                      {allowedNext.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </Select>
                  </Field>
                  {(needsReason || toStatus === "completed" || toStatus === "driver_on_the_way") && (
                    <p className="text-xs text-slate-500">
                      {toStatus === "driver_on_the_way" && "Requires an assigned driver and a recorded driver confirmation. "}
                      {toStatus === "completed" && "Requires a final fare. "}
                      {needsReason && "Requires a reason. "}
                    </p>
                  )}
                  {(needsReason || toStatus === "completed") && (
                    <Field label={needsReason ? "Reason" : "Note (optional)"}>
                      <Input value={statusReason} onChange={(e) => setStatusReason(e.target.value)} />
                    </Field>
                  )}
                  {toStatus === "completed" && (
                    <Field label="Final fare (₹)" hint={`Estimate was ${money(b.fareEstimate?.total)}`}>
                      <Input type="number" min={0} value={finalFare} onChange={(e) => setFinalFare(e.target.value)} />
                    </Field>
                  )}
                  {["cancelled", "customer_no_show"].includes(toStatus) && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field label="Cancellation fee (₹)"><Input type="number" min={0} value={fee} onChange={(e) => setFee(e.target.value)} /></Field>
                      <Field label="Refund to customer (₹)"><Input type="number" min={0} value={refund} onChange={(e) => setRefund(e.target.value)} /></Field>
                    </div>
                  )}
                  <Button type="submit" disabled={!toStatus || busy || (needsReason && statusReason.trim().length < 3)}>Update status</Button>
                </form>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="font-semibold">Fare</h2>
            <p className="mt-2 text-sm">Estimate: <strong>{money(b.fareEstimate?.total)}</strong></p>
            <p className="text-sm">Final: <strong>{money(b.finalFare)}</strong></p>
            <ul className="mt-3 space-y-1 text-xs text-slate-600">
              {b.fareEstimate?.lines?.map((l: any, i: number) => <li key={i} className="flex justify-between"><span>{l.label}</span><span>{money(l.amount)}</span></li>)}
            </ul>
            {b.fareEstimate?.usesUnconfirmedRules && <p className="mt-3 rounded bg-amber-50 p-2 text-xs text-amber-900">Estimate uses placeholder combination rules. Confirm the fare before finalising.</p>}
            {can(role, "bookings:fare_adjust") && (
              <form className="mt-4 space-y-3" onSubmit={async (e) => {
                e.preventDefault();
                const ok = await run(() => api(`/admin/bookings/${id}/fare`, { method: "PATCH", body: { finalFare: Number(newFare), reason: fareReason.trim(), expectedVersion: b.version } }), "Fare updated.");
                if (ok) { setNewFare(""); setFareReason(""); }
              }}>
                <Field label="Adjust final fare (₹)"><Input type="number" min={0} value={newFare} onChange={(e) => setNewFare(e.target.value)} /></Field>
                <Field label="Reason" hint="Required. Recorded in the audit log."><Input value={fareReason} onChange={(e) => setFareReason(e.target.value)} /></Field>
                <Button type="submit" variant="secondary" disabled={busy || !newFare || fareReason.trim().length < 5}>Save fare</Button>
              </form>
            )}
            {b.fareAdjustments?.length > 0 && (
              <ul className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-600">
                {b.fareAdjustments.map((f: any, i: number) => <li key={i}>{money(f.from)} → {money(f.to)} · {f.reason}</li>)}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="font-semibold">Payments</h2>
            {payments.length === 0 ? <p className="mt-2 text-sm text-slate-600">No payments recorded.</p> : (
              <ul className="mt-3 space-y-2 text-sm">
                {payments.map((p) => <li key={p._id} className="flex justify-between"><span>{p.method.toUpperCase()} · {p.status}</span><strong>{money(p.amount)}</strong></li>)}
              </ul>
            )}
            {can(role, "payments:record_offline") && (
              <form className="mt-4 space-y-3" onSubmit={async (e) => {
                e.preventDefault();
                const ok = await run(() => api(`/admin/bookings/${id}/offline-payment`, { method: "POST", body: { amount: Number(cashAmount), method: "cash", reference: cashRef.trim() || undefined } }), "Cash receipt recorded.");
                if (ok) { setCashAmount(""); setCashRef(""); }
              }}>
                <Field label="Cash received by driver (₹)"><Input type="number" min={1} value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} /></Field>
                <Field label="Reference / notes"><Input value={cashRef} onChange={(e) => setCashRef(e.target.value)} /></Field>
                <Button type="submit" variant="secondary" disabled={busy || !cashAmount}>Record cash receipt</Button>
              </form>
            )}
          </Card>

          <Card>
            <h2 className="font-semibold">Customer messages</h2>
            <p className="mt-1 text-xs text-slate-500">Automatic updates (email for now; WhatsApp once connected).</p>
            {messages.length === 0 ? <p className="mt-2 text-sm text-slate-600">No messages yet.</p> : (
              <ul className="mt-3 space-y-2 text-sm">
                {messages.map((m: any) => (
                  <li key={m._id} className="rounded-lg bg-slate-50 p-3">
                    <span className="font-medium">{m.event.replace(/_/g, " ")}</span> · {m.channel} · {m.sent ? <span className="text-emerald-700">sent</span> : <span className="text-amber-700">pending ({m.error})</span>}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="font-semibold">History</h2>
            <ol className="mt-3 space-y-3 text-sm">
              {[...(b.statusHistory ?? [])].reverse().map((h: any, i: number) => (
                <li key={i} className="border-l-2 border-slate-200 pl-3">
                  <p className="font-medium">{h.from ? `${STATUS_LABEL[h.from] ?? h.from} → ` : ""}{STATUS_LABEL[h.to] ?? h.to}</p>
                  <p className="text-xs text-slate-500">{dateTime(h.at)} · {h.actorKind}{h.reason ? ` · ${h.reason}` : ""}</p>
                </li>
              ))}
            </ol>
            {b.conflictOverrides?.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-amber-800">
                <p className="font-medium">Conflict overrides</p>
                {b.conflictOverrides.map((o: any, i: number) => <p key={i}>{dateTime(o.at)}: {o.reason}</p>)}
              </div>
            )}
          </Card>
        </div>
      </div>
      <p className="mt-6 text-xs text-slate-500">Changing status, assignment, fares and payments are recorded in the audit log with your name and time.</p>
    </>
  );
}

function Info({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <dt className="text-slate-500">{k}</dt>
      <dd className="mt-0.5 font-medium">{v}</dd>
    </div>
  );
}

