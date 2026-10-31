import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "Terms of Service — Droovee",
  description:
    "Droovee Terms of Service. Clear terms governing professional driver booking for your own vehicle, customer undertakings, pricing, and DPDP Act communications consent.",
};

export default function TermsPage() {
  const lastUpdated = "October 31, 2026";

  return (
    <PublicShell>
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            Legal Agreement
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Last updated: {lastUpdated} · Effective for all users
          </p>
        </div>

        {/* Highlight Card */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Service Summary at a Glance
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 text-xs leading-relaxed text-slate-700">
            <div className="rounded-xl border border-slate-200/80 bg-white p-3.5">
              <span className="font-bold text-slate-900 block mb-1">Your Vehicle</span>
              You provide the car; we provide a trained, verified professional chauffeur.
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white p-3.5">
              <span className="font-bold text-slate-900 block mb-1">Transparent Pricing</span>
              Clear hourly rates. Tolls, parking, and fuel are paid by the customer.
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white p-3.5">
              <span className="font-bold text-slate-900 block mb-1">DPDP Protected</span>
              Your contact data is never sold or shared with any third party.
            </div>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-bold text-slate-900">1. Acceptance of Terms & Platform Scope</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              These Terms of Service (&ldquo;Terms&rdquo;) constitute a legally binding agreement between you (&ldquo;Customer&rdquo;, &ldquo;User&rdquo;, or &ldquo;You&rdquo;) and <strong>Ruby Mobility Services</strong> (&ldquo;Droovee&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). By accessing our website, registering an account, or requesting a driver, you agree to be bound by these Terms and our DPDP Act-compliant <Link href="/privacy" className="text-brand-link font-medium underline">Privacy Policy</Link>.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              <strong>Service Nature:</strong> Droovee is a specialized mobility management platform that dispatches background-checked, uniformed chauffeurs to drive <em>your personal, commercial, or fleet vehicle</em>. Droovee does not provide vehicle rentals, taxi cabs, or passenger vehicles.
            </p>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-slate-900">2. User Account & Security</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-600">
              <li>
                <strong>Registration:</strong> To book or manage trips, you must register using a valid Indian mobile number and secure password. You represent that all details provided are true, accurate, and current.
              </li>
              <li>
                <strong>Authentication & Security:</strong> You are responsible for safeguarding your login credentials. You must notify us immediately of any suspected unauthorized account activity.
              </li>
              <li>
                <strong>One Account per Individual:</strong> Droovee reserves the right to suspend or terminate duplicate accounts or accounts displaying fraudulent or abusive booking activity.
              </li>
            </ul>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-slate-900">3. Communications & Direct Marketing Consent (DPDP Act, 2023)</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              In accordance with Section 6 of the Digital Personal Data Protection Act, 2023:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
              <li>
                <strong>Consent to Direct Contact:</strong> By providing your mobile number and email during account registration or sign-in, you give your explicit consent to receive operational booking notifications (driver details, arrival alerts, fare invoices) and promotional updates directly from Droovee via WhatsApp, SMS, phone call, or email.
              </li>
              <li>
                <strong>Strict Non-Disclosure Covenant:</strong> Droovee expressly warrants and covenants that <strong>we will never sell, lease, transfer, or share your contact number or email ID with third-party advertisers, data aggregators, or marketing firms</strong>. All promotional communications originate directly from Droovee.
              </li>
              <li>
                <strong>Easy Opt-Out Mechanism:</strong> You maintain the unconditional right to withdraw consent for marketing messages at any time by replying &ldquo;STOP&rdquo; on WhatsApp, clicking unsubscribe in marketing emails, or contacting our dispatch support. Opting out of promotional messages will never affect your ride bookings or critical service alerts.
              </li>
            </ul>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-slate-900">4. Customer Undertakings & Vehicle Readiness</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              As the vehicle owner or authorized custodian, you warrant and agree that:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
              <li>
                <strong>Vehicle Legality & Insurance:</strong> The vehicle provided to the driver is roadworthy, legally registered, holds a valid Pollution Under Control (PUC) certificate, and has an active comprehensive motor insurance policy covering third-party liabilities and authorized driver operation.
              </li>
              <li>
                <strong>Fuel & Consumables:</strong> You must supply the vehicle with adequate fuel, engine oil, coolant, working spare tire, and functioning headlights and brakes.
              </li>
              <li>
                <strong>Direct Trip Expenses:</strong> All tolls, state entry border taxes, municipal parking fees, airport access fees, and fuel are the sole financial responsibility of the customer.
              </li>
              <li>
                <strong>Outstation Allowances:</strong> For outstation trips requiring overnight halts, the customer is responsible for providing the driver with suitable meals, sanitary lodging, or paying the designated overnight halt allowance (₹399/night).
              </li>
            </ul>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-slate-900">5. Driver Conduct & Vehicle Damage Protocol</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-600">
              <li>
                <strong>Verified Drivers:</strong> Droovee assigns chauffeurs who have undergone Aadhaar identification, driving licence validation, and police verification.
              </li>
              <li>
                <strong>Traffic Infractions:</strong> Traffic fines resulting directly from the driver&apos;s operational fault (e.g., speeding, jumping a signal) are the driver&apos;s responsibility. Fines arising from vehicle defects, missing documents, tint violations, or expired insurance/PUC are the customer&apos;s responsibility.
              </li>
              <li>
                <strong>Accident & Damage Procedure:</strong> In the unlikely event of physical damage occurring while the chauffeur is operating your vehicle, the driver and customer must immediately inform Droovee dispatch. Claims will be investigated in accordance with our Driver Responsibility Protocol and standard motor vehicle insurance procedures.
              </li>
            </ul>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-slate-900">6. Fare Structure, Payment & Booking Policies</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-600">
              <li>
                <strong>Estimate vs. Final Fare:</strong> Online estimates reflect base duration pricing. The final payable fare is confirmed by our operations team and accounts for actual trip hours, extensions, and applicable surcharges.
              </li>
              <li>
                <strong>Late-Night Surcharge:</strong> Trips commencing or operating between 10:00 PM and 6:00 AM IST are subject to an additional late-night chauffeur allowance.
              </li>
              <li>
                <strong>Payment Terms:</strong> Fares are payable via UPI, Cash, or online card payment upon trip completion. Invoices are emailed and logged in your online booking portal.
              </li>
              <li>
                <strong>Cancellations:</strong> Free cancellation is permitted up to 2 hours prior to scheduled start time. Cancellations made after a driver has been dispatched or customer no-shows are subject to a nominal dispatch fee to compensate the driver.
              </li>
            </ul>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-slate-900">7. Governing Law & Dispute Resolution</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              These Terms are governed by the laws of India. Any disputes, claims, or controversies arising under these Terms shall be subject to the exclusive jurisdiction of the competent courts in <strong>Bhubaneswar, Odisha</strong>.
            </p>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-slate-900">8. Grievance Redressal & Support</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              For any questions regarding these Terms or support with your active bookings, contact our team:
            </p>
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-700 space-y-1">
              <p><strong>Support & Dispatch Desk:</strong> Ruby Mobility Services (Droovee)</p>
              <p><strong>Email:</strong> <a href="mailto:support@droovee.in" className="text-brand-link font-medium underline">support@droovee.in</a></p>
              <p><strong>Phone / WhatsApp:</strong> <a href="tel:+918114994367" className="text-brand-link font-medium">+91 81149 94367</a></p>
              <p><strong>Location:</strong> Bhubaneswar, Odisha, India · Open 24×7</p>
            </div>
          </Card>
        </div>

        {/* Footer Navigation Link */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-6 text-xs text-slate-500">
          <p>© 2026 Ruby Mobility Services. All rights reserved.</p>
          <Link href="/privacy" className="font-semibold text-brand-link hover:underline">
            View Privacy Policy (DPDP Act) →
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
