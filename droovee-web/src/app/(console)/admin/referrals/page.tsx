"use client";
import { useEffect, useState } from "react";
import { Alert, Card, Empty, PageTitle, Table } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { dateTime } from "@/lib/format";

/** Referrals: who referred whom; ₹100 credit earned on completion, rewarded via Coupons. */
export default function ReferralsPage() {
  const [items, setItems] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ items: any[] }>("/admin/referrals")
      .then((r) => setItems(r.items))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not load referrals."));
  }, []);

  return (
    <>
      <PageTitle title="Referrals" subtitle="Friend books with a code → referrer earns ₹100 credit on completion. Fulfil rewards with a coupon from the Coupons module." />
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {items === null && !error && <p className="text-sm text-slate-500">Loading…</p>}
      {items && items.length === 0 && <Empty title="No referrals yet" />}
      {items && items.length > 0 && (
        <Card>
          <Table head={["Code", "Referrer", "Friend", "Status", "Date"]}>
            {items.map((r, i) => (
              <tr key={i}>
                <td className="px-4 py-3 font-mono">{r.code}</td>
                <td className="px-4 py-3">{r.referrer ? `${r.referrer.name} (${r.referrer.phone})` : "—"}</td>
                <td className="px-4 py-3">{r.referred ? `${r.referred.name} (${r.referred.phone})` : "—"}</td>
                <td className="px-4 py-3">{r.status === "earned" ? "✓ ₹100 earned" : r.status === "rewarded" ? "Rewarded" : "Recorded"}</td>
                <td className="px-4 py-3">{dateTime(r.createdAt)}</td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
    </>
  );
}
