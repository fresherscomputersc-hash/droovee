import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/PublicShell";
import { Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "Privacy Policy (DPDP Act, 2023 Compliant) — Droovee",
  description:
    "Droovee Privacy Policy under India's Digital Personal Data Protection Act, 2023. Transparent notice on personal data collection, direct marketing use, and our strict zero-third-party sharing pledge.",
};

export default function PrivacyPage() {
  const lastUpdated = "October 31, 2026";

  return (
    <PublicShell>
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div>
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
            DPDP Act, 2023 Compliant
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Last updated: {lastUpdated} · Effective immediately
          </p>
        </div>

        {/* Core Guarantee Card */}
        <div className="rounded-2xl border border-brand-ink/10 bg-gradient-to-br from-brand-soft/60 to-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-accent text-brand-ink font-black text-lg">
              🛡️
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Our Non-Negotiable Privacy Pledge
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">
                <strong>We strictly NEVER sell, rent, lease, or share your mobile number, email address, or personal data with any third-party marketing agency, advertiser, or data broker.</strong> Any promotional updates or booking communications you receive come directly and exclusively from Droovee.
              </p>
            </div>
          </div>
        </div>

        {/* Policy Sections */}
        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-bold text-slate-900">1. Data Fiduciary & Regulatory Framework</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              This Privacy Policy is published by <strong>DROOVEE MOBILITY PVT. LTD.</strong>, operating the platform <strong>Droovee</strong> (&ldquo;Droovee&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), having its operational headquarters in Bhubaneswar, Odisha, India. We act as the <strong>Data Fiduciary</strong> in terms of <strong>Section 2(i) of the Digital Personal Data Protection Act, 2023 (&ldquo;DPDP Act&rdquo;)</strong>.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              This policy governs the collection, processing, storage, and protection of digital personal data of customers (&ldquo;Data Principals&rdquo;) accessing our website, web application, booking interfaces, and associated mobility dispatch services.
            </p>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-slate-900">2. Personal Data We Collect</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              We collect only the minimum necessary personal data required to deliver chauffeur services and maintain account integrity:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
              <li>
                <strong>Identity & Contact Information:</strong> Full name, Indian mobile number (E.164 standard), and email address (optional on booking, collected during account setup).
              </li>
              <li>
                <strong>Booking & Ride Information:</strong> Pickup address, trip destination, date and scheduled start time, vehicle make/model, trip duration, and customer service notes.
              </li>
              <li>
                <strong>Account & Security Metadata:</strong> Hashed passwords (salted bcrypt; plaintext passwords are never stored or accessible), one-time passcode verification timestamps (OTP hash with automatic expiration), account creation timestamps, and record of successful logins (last login timestamps).
              </li>
              <li>
                <strong>Operational & Support Logs:</strong> Audit trails of dispatch assignments, customer feedback, ratings, and customer service interactions via WhatsApp or telephone.
              </li>
            </ul>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-slate-900">3. Lawful Purpose of Data Processing (DPDP Act, Section 4 & Section 6)</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              In strict accordance with the DPDP Act, 2023, your personal data is processed solely for specified, lawful, and transparent purposes:
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <h3 className="font-semibold text-slate-900 text-sm">Trip Fulfillment & Driver Dispatch</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Assigning background-verified chauffeurs to your private vehicle, facilitating pickup coordination, and calculating trip estimates.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <h3 className="font-semibold text-slate-900 text-sm">Account Security & Authentication</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Verifying account ownership via OTP, maintaining authenticated sessions, tracking login activity, and preventing unauthorized account takeover.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <h3 className="font-semibold text-slate-900 text-sm">Direct Customer Marketing & Offers</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Informing you of launch benefits (e.g. <em>First Hour Free</em>, coupon code <code className="font-mono text-slate-800">FIRST30</code>), seasonal promotions, and service upgrades directly from Droovee via WhatsApp, SMS, or email.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <h3 className="font-semibold text-slate-900 text-sm">Statutory Compliance & Invoicing</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Issuing legally required ride receipts, maintaining operational tax records, and supporting dispute resolution under Indian law.
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-slate-900">4. Third-Party Sharing Prohibition</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Droovee operates on a strict zero-leakage data architecture:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
              <li>
                <strong>No Commercial Sale:</strong> We do not sell, rent, monetize, or disclose your contact details or ride histories to external advertisers, telemarketers, credit agencies, or data aggregators.
              </li>
              <li>
                <strong>Driver Access Limitation:</strong> Your assigned chauffeur receives only your name, pickup location, and contact phone number, and only after the trip is officially assigned. Drivers have zero access to your email, account history, or payment records.
              </li>
              <li>
                <strong>Technical Infrastructure Partners:</strong> Data is hosted on ISO 27001 / SOC 2 certified cloud servers and transactional communication providers (e.g., WhatsApp Business API) operating under strict data processing agreements that forbid secondary use.
              </li>
            </ul>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-slate-900">5. Your Statutory Rights as a Data Principal (DPDP Act, Sections 11–14)</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Under India&apos;s DPDP Act, 2023, you hold enforceable legal rights regarding your personal data:
            </p>
            <div className="mt-4 space-y-3">
              <div className="border-l-2 border-emerald-500 pl-3">
                <h3 className="text-sm font-semibold text-slate-900">Right to Access (Section 11)</h3>
                <p className="text-xs text-slate-600">You may request a summary of your personal data processed by Droovee and the identities of personnel with whom it was shared.</p>
              </div>
              <div className="border-l-2 border-emerald-500 pl-3">
                <h3 className="text-sm font-semibold text-slate-900">Right to Correction & Completion (Section 12)</h3>
                <p className="text-xs text-slate-600">You have the right to correct inaccurate or outdated information or complete any incomplete data record.</p>
              </div>
              <div className="border-l-2 border-emerald-500 pl-3">
                <h3 className="text-sm font-semibold text-slate-900">Right to Erasure &quot;Right to be Forgotten&quot; (Section 12(3))</h3>
                <p className="text-xs text-slate-600">You may request deletion of your account, mobile number, and personal records when there is no active booking or pending legal obligation.</p>
              </div>
              <div className="border-l-2 border-emerald-500 pl-3">
                <h3 className="text-sm font-semibold text-slate-900">Right to Withdraw Marketing Consent (Section 6(4))</h3>
                <p className="text-xs text-slate-600">
                  You may opt out of promotional messages at any time by replying &ldquo;STOP&rdquo; to WhatsApp messages, clicking unsubscribe in emails, or contacting support. Opting out of marketing will never disrupt your ability to book drivers or receive critical ride confirmations.
                </p>
              </div>
              <div className="border-l-2 border-emerald-500 pl-3">
                <h3 className="text-sm font-semibold text-slate-900">Right to Nominate (Section 14)</h3>
                <p className="text-xs text-slate-600">You have the right to nominate any individual to exercise your rights under the DPDP Act in the event of death or incapacity.</p>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-slate-900">6. Technical & Operational Security Measures</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              We employ state-of-the-art security safeguards in accordance with Section 8(5) of the DPDP Act:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
              <li>All web traffic is encrypted end-to-end using TLS 1.3 cryptographic protocols.</li>
              <li>Passwords are transformed using 12-round salted bcrypt hashes; plaintext passwords never touch our database.</li>
              <li>Administrative access to customer records is restricted by fine-grained Role-Based Access Control (RBAC). Every staff query is immutably recorded in our internal audit logs.</li>
              <li>Data retention is minimized: expired OTP hashes are automatically purged by database TTL indices after 10 minutes.</li>
            </ul>
          </Card>

          <Card>
            <h2 className="text-lg font-bold text-slate-900">7. Data Protection & Grievance Redressal Officer</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              In accordance with Section 13 of the DPDP Act, 2023, Droovee has appointed a designated Grievance Redressal Officer to resolve any queries, requests, or complaints:
            </p>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-700 space-y-1">
              <p><strong>Designation:</strong> Data Protection & Grievance Redressal Officer</p>
              <p><strong>Entity:</strong> DROOVEE MOBILITY PVT. LTD. (Droovee)</p>
              <p><strong>Email:</strong> <a href="mailto:droovee.admin@gmail.com" className="text-brand-link font-medium underline">droovee.admin@gmail.com</a></p>
              <p><strong>Phone / WhatsApp:</strong> <a href="tel:+918114994367" className="text-brand-link font-medium">+91 81149 94367</a></p>
              <p><strong>Postal Address:</strong> Patia / Infocity Road, Bhubaneswar, Odisha 751024, India</p>
              <p className="pt-2 text-slate-500">
                Response timeline: All inquiries and erasure requests are acknowledged within 24 hours and resolved within 7 business days. If you are unsatisfied with our resolution, you retain the right to approach the <strong>Data Protection Board of India</strong>.
              </p>
            </div>
          </Card>
        </div>

        {/* Footer Navigation Link */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-6 text-xs text-slate-500">
          <p>© 2026 DROOVEE MOBILITY PVT. LTD. All rights reserved.</p>
          <Link href="/terms" className="font-semibold text-brand-link hover:underline">
            View Terms of Service →
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
