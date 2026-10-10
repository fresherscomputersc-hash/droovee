import { AdminShell } from "@/components/AdminShell";

/** Guards and frames every admin dashboard page. /admin/login is outside this group. */
export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
