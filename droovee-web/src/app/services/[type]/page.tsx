import { redirect, notFound } from "next/navigation";

/**
 * Legacy service-page redirects.
 *
 * Old dynamic /services/[type] pages are permanently redirected to their new
 * canonical service pages. Unknown service types return 404. Query parameters
 * are preserved across the redirect so deep links (e.g. ?next=) keep working.
 */
const MAPPING: Record<string, string> = {
  // Hourly / city services
  hourly: "/city",
  half_day: "/city",
  full_day: "/city",
  // Monthly
  monthly_office: "/monthly",
  // Outstation
  outstation_one_way: "/outstation",
  outstation_round_trip: "/outstation",
  // Airport / railway / bus-stop
  airport_pickup_drop: "/airport-transfer",
};

export default async function LegacyServicePage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { type } = await params;
  const sp = await searchParams;
  const dest = MAPPING[type];
  if (!dest) {
    notFound();
  }

  const query = new URLSearchParams(sp as Record<string, string>).toString();
  redirect(dest + (query ? "?" + query : ""));
}
