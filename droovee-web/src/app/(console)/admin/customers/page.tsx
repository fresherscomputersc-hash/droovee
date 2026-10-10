"use client";
import { useEffect, useState } from "react";
import { Alert, Empty, Input, PageTitle, Pager, Table } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { dateOnly } from "@/lib/format";

export default function CustomersPage() {
  const [phone, setPhone] = useState("");
  const [items, setItems] = useState<any[] | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 50;
  const [error, setError] = useState<string | null>(null);

  async function search(p = phone, pg = 1) {
    setError(null);
    const q = new URLSearchParams({ limit: String(LIMIT), page: String(pg) });
    if (p.trim()) q.set("phone", p.trim());
    try {
      const r = await api<{ items: any[]; page: number; limit: number; total: number }>(`/admin/customers?${q.toString()}`);
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

  return (
    <>
      <PageTitle title="Customers" subtitle="Search by mobile number. Contact details are shown only to authorised staff." />
      <form className="mb-6 flex max-w-md gap-2" onSubmit={(e) => { e.preventDefault(); search(); }}>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile number" />
        <button className="rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700" type="submit">Search</button>
      </form>
      {error && <Alert>{error}</Alert>}
      {items && items.length === 0 && <Empty title="No customers found" />}
      {items && items.length > 0 && (
        <>
          <Table head={["Name", "Phone", "Email", "Joined", "Account"]}>
            {items.map((c) => (
              <tr key={c._id}>
                <td className="px-4 py-3">{c.name}</td>
                <td className="px-4 py-3">{c.phone}</td>
                <td className="px-4 py-3">{c.email || "—"}</td>
                <td className="px-4 py-3">{dateOnly(c.createdAt)}</td>
                <td className="px-4 py-3">{c.active ? "Active" : "Disabled"}</td>
              </tr>
            ))}
          </Table>
          <Pager page={page} total={total} limit={LIMIT} onPage={(p) => search(phone, p)} />
        </>
      )}
    </>
  );
}
