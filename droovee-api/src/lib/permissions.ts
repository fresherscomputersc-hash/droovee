/**
 * Staff roles and permissions.
 * Confirmed roles (answers §24): owner/super admin, operations, support, finance.
 * The mapping below is derived from the PRD RBAC table and the confirmed answers.
 * Review with the client before launch: "limited" scopes are enforced in service code.
 */

export const STAFF_ROLES = ["owner_super_admin", "operations", "support", "finance"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const PERMISSIONS = [
  "bookings:read",
  "bookings:create_for_customer",
  "bookings:assign",
  "bookings:reassign",
  "bookings:status",
  "bookings:fare_adjust",
  "bookings:cancel_decide",
  "contact_log:write",
  "drivers:read",
  "drivers:write",
  "availability:write",
  "conflict:override",
  "payments:read",
  "payments:record_offline",
  "payments:refund",
  "pricing:write",
  "coupons:write",
  "customers:read",
  "reports:read",
  "audit:read",
  "staff:manage",
  "tickets:read",
  "tickets:write",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL = new Set<Permission>(PERMISSIONS);

export const ROLE_PERMISSIONS: Record<StaffRole, Set<Permission>> = {
  owner_super_admin: ALL,
  operations: new Set<Permission>([
    "bookings:read",
    "bookings:create_for_customer",
    "bookings:assign",
    "bookings:reassign",
    "bookings:status",
    "contact_log:write",
    "drivers:read",
    "availability:write",
    "conflict:override",
    "customers:read",
    "tickets:read",
  ]),
  support: new Set<Permission>(["bookings:read", "customers:read", "tickets:read", "tickets:write"]),
  finance: new Set<Permission>([
    "bookings:read",
    "payments:read",
    "payments:record_offline",
    "payments:refund",
    "reports:read",
  ]),
};

export function hasPermission(role: StaffRole, perm: Permission): boolean {
  return ROLE_PERMISSIONS[role].has(perm);
}
