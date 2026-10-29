"use client";
import { useState } from "react";
import { Alert, Button, Card, Field, Textarea } from "@/components/ui";
import { api, ApiError } from "@/lib/api";

/** Copyable family share-trip link. */
export function ShareLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/share/${token}` : `/share/${token}`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <code className="min-w-0 flex-1 break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs">{url}</code>
      <Button type="button" variant="secondary" onClick={copy}>{copied ? "Copied ✓" : "Copy link"}</Button>
      <a href={url} target="_blank" rel="noreferrer" className="text-xs font-medium text-brand-link underline">Open</a>
    </div>
  );
}

/** Rate a completed trip (once). */
export function RateTrip({ bookingId }: { bookingId: string }) {
  const [stars, setStars] = useState(5);
  const [review, setReview] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/ratings", { method: "POST", body: { bookingId, stars, review: review.trim() || undefined } });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit your rating.");
    } finally {
      setBusy(false);
    }
  }

  if (done) return <Card><Alert tone="success">Thanks for rating your trip! 🙏</Alert></Card>;

  return (
    <Card>
      <h2 className="font-semibold">Rate your trip</h2>
      <form onSubmit={submit} className="mt-3 space-y-3" noValidate>
        {error && <Alert>{error}</Alert>}
        <div className="flex gap-1" role="radiogroup" aria-label="Stars">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={stars === s}
              onClick={() => setStars(s)}
              className={`grid h-10 w-10 place-items-center rounded-lg text-xl ${stars >= s ? "" : "grayscale opacity-40"}`}
              aria-label={`${s} star${s === 1 ? "" : "s"}`}
            >
              ⭐
            </button>
          ))}
        </div>
        <Field label="Review (optional)">
          <Textarea rows={2} value={review} onChange={(e) => setReview(e.target.value)} placeholder="How was your driver?" />
        </Field>
        <Button type="submit" disabled={busy}>{busy ? "Sending…" : "Submit rating"}</Button>
      </form>
    </Card>
  );
}
