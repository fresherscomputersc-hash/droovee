"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Card, Field, Input, PageTitle, Select, Textarea } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { SERVICE_LABEL, istInputToIso } from "@/lib/format";

function istDefaultStart() {
  const istNow = Date.now() + 330 * 60_000;
  const rounded = Math.ceil((istNow + 60 * 60_000) / 3_600_000) * 3_600_000;
  return new Date(rounded).toISOString().slice(0, 16);
}

/** Staff creates a booking for a call/WhatsApp customer in under a minute. */
export default function AdminCreateBookingPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    serviceType: "hourly",
    pickupAddress: "",
    destinationAddress: "",
    start: istDefaultStart(),
    hours: 2,
    carModel: "",
    transmission: "manual",
    instructions: "",
    couponCode: "",
    source: "call",
  });
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFields({});
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        serviceType: form.serviceType,
        pickupAddress: form.pickupAddress.trim(),
        scheduledStart: istInputToIso(form.start),
        durationHours: Number(form.hours),
        carModel: form.carModel.trim(),
        transmission: form.transmission,
        instructions: form.instructions.trim(),
        source: form.source,
      };
      if (form.email.trim()) body.email = form.email.trim();
      if (form.destinationAddress.trim()) body.destinationAddress = form.destinationAddress.trim();
      if (form.couponCode.trim()) body.couponCode = form.couponCode.trim().toUpperCase();
      const b = await api<{ id: string }>("/admin/bookings", { method: "POST", body });
      router.push(`/admin/bookings/${b.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFields(err.fieldErrors ?? {});
      } else setError("Could not create the booking.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageTitle title="Create booking" subtitle="For customers who call or WhatsApp. Source is recorded." />
      <Card>
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2" noValidate>
          {error && <div className="md:col-span-2"><Alert>{error}</Alert></div>}
          <Field label="Customer name *" error={fields.name}>
            <Input value={form.name} onChange={set("name")} invalid={!!fields.name} />
          </Field>
          <Field label="Mobile number *" error={fields.phone}>
            <Input value={form.phone} onChange={set("phone")} inputMode="tel" invalid={!!fields.phone} />
          </Field>
          <Field label="Email (for confirmation)">
            <Input value={form.email} onChange={set("email")} inputMode="email" />
          </Field>
          <Field label="Source">
            <Select value={form.source} onChange={set("source")}>
              <option value="call">Phone call</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="website">Website</option>
            </Select>
          </Field>
          <Field label="Service type">
            <Select value={form.serviceType} onChange={set("serviceType")}>
              {Object.entries(SERVICE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field label="Car transmission">
            <Select value={form.transmission} onChange={set("transmission")}>
              <option value="manual">Manual</option>
              <option value="automatic">Automatic</option>
            </Select>
          </Field>
          <Field label="Pickup address *" error={fields.pickupAddress}>
            <Textarea rows={2} value={form.pickupAddress} onChange={set("pickupAddress")} />
          </Field>
          <Field label="Destination">
            <Textarea rows={2} value={form.destinationAddress} onChange={set("destinationAddress")} />
          </Field>
          <Field label="Start (IST) *" error={fields.scheduledStart}>
            <Input type="datetime-local" value={form.start} onChange={set("start")} />
          </Field>
          <Field label="Hours *">
            <Input type="number" min={0.5} step={0.5} value={form.hours} onChange={set("hours")} />
          </Field>
          <Field label="Car model *" error={fields.carModel}>
            <Input value={form.carModel} onChange={set("carModel")} invalid={!!fields.carModel} />
          </Field>
          <Field label="Coupon code">
            <Input value={form.couponCode} onChange={set("couponCode")} placeholder="LAUNCH99" />
          </Field>
          <Field label="Notes">
            <Textarea rows={2} value={form.instructions} onChange={set("instructions")} />
          </Field>
          <div className="flex items-end">
            <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create booking"}</Button>
          </div>
        </form>
      </Card>
    </>
  );
}
