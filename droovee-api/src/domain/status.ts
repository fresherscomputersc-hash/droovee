/** Confirmed booking statuses (Droovee answers, §18). */
export const BOOKING_STATUSES = [
  "requested",
  "confirmed",
  "driver_assigned",
  "driver_on_the_way",
  "in_progress",
  "completed",
  "cancelled",
  "rejected",
  "customer_no_show",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/**
 * Allowed transitions. Anything not listed is rejected.
 * Terminal states: completed, cancelled, rejected, customer_no_show.
 * Note: whether customers can confirm completion is open (not modelled here).
 */
export const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  requested: ["confirmed", "rejected", "cancelled"],
  confirmed: ["driver_assigned", "cancelled", "rejected", "customer_no_show"],
  driver_assigned: ["driver_on_the_way", "confirmed", "cancelled", "customer_no_show"],
  driver_on_the_way: ["in_progress", "driver_assigned", "cancelled", "customer_no_show"],
  // Trips can still go wrong mid-ride (emergency, breakdown, no-show at
  // pickup): staff may cancel or mark no-show with a reason instead of
  // fabricating a completion.
  in_progress: ["completed", "cancelled", "customer_no_show"],
  completed: [],
  cancelled: [],
  rejected: [],
  customer_no_show: [],
};

export const TERMINAL_STATUSES: BookingStatus[] = ["completed", "cancelled", "rejected", "customer_no_show"];

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isTerminal(s: BookingStatus): boolean {
  return TRANSITIONS[s].length === 0;
}
