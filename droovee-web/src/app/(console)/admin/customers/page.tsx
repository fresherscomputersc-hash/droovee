"use client";
import { useEffect, useState } from "react";
import { Alert, Empty, Input, PageTitle, Pager, Table } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { dateOnly } from "@/lib/format";

interface CustomerRecord {
  _id: string;
  name: string;
  phone: string;
  email?: string | null;
  active: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
  marketingConsent?: boolean;
}

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<CustomerRecord[] | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 50;
  const [error, setError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  async function search(q = searchQuery, pg = 1) {
    setError(null);
    const params = new URLSearchParams({ limit: String(LIMIT), page: String(pg) });
    if (q.trim()) params.set("search", q.trim());
    try {
      const r = await api<{ items: CustomerRecord[]; page: number; limit: number; total: number }>(
        `/admin/customers?${params.toString()}`
      );
      setItems(r.items);
      setPage(r.page);
      setTotal(r.total);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load customers.");
    }
  }

  useEffect(() => {
    search("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function formatDateTime(iso?: string | null) {
    if (!iso) return "Never";
    const d = new Date(iso);
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function exportCsv() {
    try {
      const res = await api<{ items: CustomerRecord[] }>("/admin/customers/export");
      const rows = res.items || [];
      const headers = ["Name", "Phone", "Email", "Last Login", "Joined", "Marketing Consent", "Status"];
      const csvContent = [
        headers.join(","),
        ...rows.map((c) =>
          [
            `"${(c.name || "").replace(/"/g, '""')}"`,
            `"${c.phone || ""}"`,
            `"${(c.email || "").replace(/"/g, '""')}"`,
            `"${c.lastLoginAt ? new Date(c.lastLoginAt).toISOString() : "Never"}"`,
            `"${c.createdAt ? new Date(c.createdAt).toISOString() : ""}"`,
            `"${c.marketingConsent !== false ? "Consented (DPDP)" : "Opted Out"}"`,
            `"${c.active ? "Active" : "Disabled"}"`,
          ].join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `droovee-marketing-customers-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      setError("Failed to generate export file.");
    }
  }

  function copyPhoneNumbers() {
    if (!items || items.length === 0) return;
    const phones = items.map((c) => c.phone).filter(Boolean).join(", ");
    navigator.clipboard.writeText(phones);
    setCopyFeedback(`Copied ${items.length} phone numbers to clipboard!`);
    setTimeout(() => setCopyFeedback(null), 3000);
  }

  function copyEmails() {
    if (!items || items.length === 0) return;
    const emails = items.map((c) => c.email).filter(Boolean).join(", ");
    navigator.clipboard.writeText(emails);
    setCopyFeedback("Copied emails to clipboard!");
    setTimeout(() => setCopyFeedback(null), 3000);
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageTitle
          title="Customers & Marketing Directory"
          subtitle="View registered and logged-in customers with verified mobile numbers and emails for direct outreach and service updates."
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
          <button
            type="button"
            onClick={copyPhoneNumbers}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            📋 Copy Phones
          </button>
          <button
            type="button"
            onClick={copyEmails}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            ✉️ Copy Emails
          </button>
        </div>
      </div>

      <div className="mt-4 mb-6 flex flex-wrap items-center gap-3">
        <form
          className="flex flex-1 max-w-md gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            search(searchQuery, 1);
          }}
        >
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by phone, name or email…"
          />
          <button
            className="rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 transition"
            type="submit"
          >
            Search
          </button>
        </form>
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              search("", 1);
            }}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 underline"
          >
            Clear
          </button>
        )}
      </div>

      {copyFeedback && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-800">
          {copyFeedback}
        </div>
      )}

      {error && <Alert>{error}</Alert>}
      {items && items.length === 0 && <Empty title="No customers found" />}
      {items && items.length > 0 && (
        <>
          <Table head={["Customer", "Mobile Number", "Email Address", "Last Login", "Joined", "DPDP Consent", "Status"]}>
            {items.map((c) => (
              <tr key={c._id} className="hover:bg-slate-50/60 transition">
                <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-800">{c.phone}</span>
                    <a
                      href={`https://wa.me/${c.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      title="Send WhatsApp message"
                      className="text-[#25D366] hover:opacity-80"
                    >
                      💬
                    </a>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {c.email ? (
                    <a href={`mailto:${c.email}`} className="text-brand-link hover:underline">
                      {c.email}
                    </a>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                  {formatDateTime(c.lastLoginAt)}
                </td>
                <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                  {dateOnly(c.createdAt)}
                </td>
                <td className="px-4 py-3 text-xs">
                  {c.marketingConsent !== false ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
                      ✓ Opted In
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-600/20">
                      Opted Out
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      c.active ? "bg-slate-100 text-slate-700" : "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20"
                    }`}
                  >
                    {c.active ? "Active" : "Disabled"}
                  </span>
                </td>
              </tr>
            ))}
          </Table>
          <Pager page={page} total={total} limit={LIMIT} onPage={(p) => search(searchQuery, p)} />
        </>
      )}
    </>
  );
}
