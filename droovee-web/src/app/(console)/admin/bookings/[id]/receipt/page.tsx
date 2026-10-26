"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { dateTime, money, SERVICE_LABEL } from "@/lib/format";

/** Printable receipt / GST invoice. Use the browser's Print → Save as PDF. */
export default function ReceiptPage() {
  const params = useParams<{ id: string }>();
  const [b, setB] = useState<any | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [invoice, setInvoice] = useState<{ gstin?: { value?: string }; gstRate?: { value?: number } } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api(`/admin/bookings/${params.id}`),
      api<{ items: any[] }>(`/admin/bookings/${params.id}/payments`).catch(() => ({ items: [] })),
      api<{ invoice?: any }>("/services").catch(() => ({ invoice: undefined })),
    ])
      .then(([bk, pay, svc]) => {
        setB(bk);
        setPayments(pay.items);
        setInvoice(svc.invoice ?? null);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not load receipt."));
  }, [params.id]);

  if (error) return <div className="p-10"><Alert>{error}</Alert></div>;
  if (!b) return <p className="p-10 text-sm text-slate-500">Loading…</p>;

  const total = b.finalFare ?? b.fareEstimate?.total ?? 0;
  const paid = payments.filter((p) => p.status === "succeeded").reduce((s, p) => s + p.amount, 0);
  const refunded = payments.filter((p) => p.status === "refunded" || p.status === "partially_refunded").reduce((s, p) => s + p.amount, 0);
  const gstin = invoice?.gstin?.value?.trim();
  const gstRate = Number(invoice?.gstRate?.value ?? 18);
  const taxable = gstin && gstRate > 0 ? total / (1 + gstRate / 100) : null;
  const gstHalf = taxable != null ? (total - taxable) / 2 : null;

  return (
    <div className="mx-auto max-w-2xl bg-white p-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xl font-bold">Droovee</p>
          <p className="text-xs text-slate-600">Bhubaneswar, Odisha · Open 24×7</p>
        </div>
        <div className="text-right">
          <p className="font-semibold">Receipt / Tax Invoice</p>
          <p className="font-mono text-sm">{b.bookingNumber}</p>
          {gstin && <p className="text-xs text-slate-600">GSTIN: {gstin}</p>}
        </div>
      </div>
      <hr className="my-4" />
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div><dt className="text-slate-500">Customer</dt><dd className="font-medium">{b.customer?.name}</dd></div>
        <div><dt className="text-slate-500">Date</dt><dd className="font-medium">{dateTime(b.scheduledStart)}</dd></div>
        <div><dt className="text-slate-500">Service</dt><dd className="font-medium">{SERVICE_LABEL[b.serviceType] ?? b.serviceType}</dd></div>
        <div><dt className="text-slate-500">Car</dt><dd className="font-medium">{b.carModel} · {b.transmission}</dd></div>
        <div className="col-span-2"><dt className="text-slate-500">Pickup</dt><dd className="font-medium">{b.pickup?.address}</dd></div>
      </dl>
      <table className="mt-4 w-full text-sm">
        <thead><tr className="border-b text-left text-slate-500"><th className="py-2">Item</th><th className="py-2 text-right">Amount</th></tr></thead>
        <tbody>
          {(b.fareEstimate?.lines ?? []).map((l: any, i: number) => (
            <tr key={i} className="border-b"><td className="py-2">{l.label}</td><td className="py-2 text-right">{money(l.amount)}</td></tr>
          ))}
          <tr className="font-semibold"><td className="py-2">Total{b.finalFare != null ? " (final)" : " (estimate)"}</td><td className="py-2 text-right">{money(total)}</td></tr>
          {taxable != null && gstHalf != null && (
            <>
              <tr><td className="py-2">Taxable value</td><td className="py-2 text-right">{money(Math.round(taxable))}</td></tr>
              <tr><td className="py-2">CGST ({gstRate / 2}%)</td><td className="py-2 text-right">{money(Math.round(gstHalf))}</td></tr>
              <tr><td className="py-2">SGST ({gstRate / 2}%)</td><td className="py-2 text-right">{money(Math.round(gstHalf))}</td></tr>
            </>
          )}
          <tr><td className="py-2">Paid</td><td className="py-2 text-right">{money(paid)}</td></tr>
          {refunded > 0 && <tr><td className="py-2">Refunded</td><td className="py-2 text-right">{money(refunded)}</td></tr>}
        </tbody>
      </table>
      <p className="mt-4 text-xs text-slate-500">Tolls, parking, fuel and the driver's food, stay and return travel are paid by the customer. Damage to the vehicle while our driver is driving is the driver's responsibility.</p>
      <button onClick={() => window.print()} className="mt-6 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white print:hidden">Print / Save as PDF</button>
    </div>
  );
}
