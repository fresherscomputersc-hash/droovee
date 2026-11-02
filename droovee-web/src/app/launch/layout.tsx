import type { Metadata } from "next";
import localFont from "next/font/local";
import "./launch.css";

// Self-hosted Montserrat (variable, latin subset, wght 400–900).
// Vendored from Google Fonts so builds never depend on fonts.googleapis.com:
// next/font/google fails the build when Google returns an extensionless
// /l/font?kit= URL (vercel/next.js#99114).
const montserrat = localFont({
  src: [{ path: "../fonts/montserrat/montserrat-variable-latin.woff2", weight: "400 900", style: "normal" }],
  display: "swap",
  variable: "--font-launch-mont",
});

export const metadata: Metadata = {
  title: "Your first hour is on us — Droovee",
  description:
    "Professional drivers for your car, anytime in Bhubaneswar. Aadhaar, licence and police verified chauffeurs. Your first hour is free.",
};

export default function LaunchLayout({ children }: { children: React.ReactNode }) {
  return <div className={montserrat.variable}>{children}</div>;
}
