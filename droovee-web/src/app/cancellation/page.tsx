import { PublicShell } from "@/components/PublicShell";
import { Card } from "@/components/ui";

export default function CancellationPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Cancellation & refunds</h1>
        <Card>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
            <li>Request cancellation from your booking page or by calling/WhatsApping us. Our team reviews every request.</li>
            <li>Any cancellation fee or refund is decided by our team per booking and recorded against it.</li>
            <li>Online payments are refunded to the original payment method; cash/UPI settlements are confirmed with you directly.</li>
            <li>If we cannot assign a driver for your slot, you pay nothing.</li>
          </ul>
        </Card>
      </div>
    </PublicShell>
  );
}
