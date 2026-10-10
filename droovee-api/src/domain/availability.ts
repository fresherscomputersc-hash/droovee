/**
 * Interval overlap logic for driver assignment.
 * Pure functions, so they can be unit-tested without a database.
 *
 * Confirmed: the system WARNS on conflicts; an authorised admin may override with a reason.
 * Buffer time is an unconfirmed policy value and is passed in explicitly.
 */

export interface Interval {
  start: Date;
  end: Date;
  /** Optional label for conflict messages. */
  ref?: string;
  kind?: "booking" | "availability_block";
}

/**
 * Returns true if [aStart,aEnd) and [bStart,bEnd) overlap once the buffer is
 * applied ONCE to the gap between them: a conflict needs gap < buffer.
 * (Expanding both intervals double-counts the buffer and rejects trips that
 * are exactly buffer-apart.)
 */
export function intervalsOverlap(a: Interval, b: Interval, bufferMinutes = 0): boolean {
  const buf = bufferMinutes * 60_000;
  return a.start.getTime() < b.end.getTime() + buf && b.start.getTime() < a.end.getTime() + buf;
}

export interface Conflict {
  kind: "booking" | "availability_block";
  ref?: string;
  start: Date;
  end: Date;
}

/** Given a proposed interval, return all conflicting intervals. */
export function findConflicts(proposed: Interval, existing: Interval[], bufferMinutes = 0): Conflict[] {
  return existing
    .filter((e) => intervalsOverlap(proposed, e, bufferMinutes))
    .map((e) => ({ kind: e.kind ?? "booking", ref: e.ref, start: e.start, end: e.end }));
}

/** End time for a booking, from start + hours (or explicit end for multi-day trips). */
export function bookingEnd(start: Date, durationHours: number, explicitEnd?: Date): Date {
  return explicitEnd ?? new Date(start.getTime() + durationHours * 3_600_000);
}
