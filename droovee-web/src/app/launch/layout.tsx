import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./launch.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
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
