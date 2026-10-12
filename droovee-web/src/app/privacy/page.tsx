import { PublicShell } from "@/components/PublicShell";
import { Card } from "@/components/ui";

export default function PrivacyPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Privacy policy</h1>
        <Card>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
            <li>We collect your name, mobile number, addresses and trip details to run your booking.</li>
            <li>Your driver sees your name, pickup address and phone number only after being assigned to your trip.</li>
            <li>Staff access is limited by role, and every sensitive action is logged in our audit trail.</li>
            <li>We never sell your data. Booking confirmations and password resets are emailed to you directly.</li>
            <li>To correct or delete your data, contact us on the number in the footer.</li>
          </ul>
        </Card>
      </div>
    </PublicShell>
  );
}
